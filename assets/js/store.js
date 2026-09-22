/* ===========================================================
   数据仓储：内存 CRUD + localStorage 持久化 + 分页/树工具
   （原型用，刷新后保留改动；可一键重置）
   =========================================================== */
window.DG = window.DG || {};

DG.store = (function () {
  var KEY = 'dg-prototype-v1';
  var db = null;

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* file:// 或隐私模式下可能不可用，忽略 */ }
    return clone(DG.data);
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { }
  }

  function init() {
    db = load();
    return db;
  }

  function reset() {
    db = clone(DG.data);
    persist();
  }

  /* ---------------- 基础 CRUD ---------------- */
  function list(key) { return db[key] || []; }

  function find(key, id) {
    var arr = list(key);
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }

  function nextId(key, prefix) {
    var arr = list(key);
    var max = 0;
    arr.forEach(function (it) {
      var m = String(it.id).replace(/[^0-9]/g, '');
      var n = parseInt(m, 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return (prefix || key.charAt(0)) + (max + 1);
  }

  function add(key, obj) {
    if (!obj.id) obj.id = nextId(key);
    db[key] = db[key] || [];
    db[key].push(obj);
    persist();
    return obj;
  }

  function update(key, id, patch) {
    var it = find(key, id);
    if (!it) return null;
    Object.keys(patch).forEach(function (k) { it[k] = patch[k]; });
    it.updateTime = it.updateTime || '';
    persist();
    return it;
  }

  function remove(key, id) {
    var arr = list(key);
    var idx = -1;
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) { idx = i; break; }
    if (idx >= 0) { arr.splice(idx, 1); persist(); return true; }
    return false;
  }

  /* ---------------- 分页 ---------------- */
  function paginate(arr, page, size) {
    page = page || 1;
    size = size || 10;
    var total = arr.length;
    var totalPages = Math.max(1, Math.ceil(total / size));
    if (page > totalPages) page = totalPages;
    var start = (page - 1) * size;
    return {
      rows: arr.slice(start, start + size),
      total: total,
      page: page,
      size: size,
      totalPages: totalPages
    };
  }

  /* ---------------- 下拉选项 ---------------- */
  function options(key, labelKey, valueKey) {
    labelKey = labelKey || 'name';
    valueKey = valueKey || 'id';
    return list(key).map(function (it) {
      return { value: it[valueKey], label: it[labelKey] };
    });
  }

  function withAll(list, text) {
    return [{ value: '', label: text || '全部' }].concat(list);
  }

  /* ---------------- 名称解析 ---------------- */
  function nameOf(key, id, fallback) {
    if (!id) return fallback || '—';
    var it = find(key, id);
    return it ? it.name : (fallback || '—');
  }
  function projectName(id) { return nameOf('projects', id); }
  function siteName(id) { return nameOf('sites', id); }
  function unitName(id) { return nameOf('units', id); }

  /* ---------------- 单位树（PRD-04） ---------------- */
  function unitTree(projectId) {
    var all = list('units').filter(function (u) {
      return !projectId || u.projectId === projectId;
    });
    function build(pid) {
      return all.filter(function (u) { return (u.parentId || null) === pid; })
        .map(function (u) {
          var children = build(u.id);
          return {
            id: u.id, name: u.name, type: u.type,
            memberCount: u.memberCount, status: u.status,
            subCount: children.length, children: children
          };
        });
    }
    return build(null);
  }

  /* 子孙 id（含自身） */
  function unitDescendants(id) {
    var out = [id];
    list('units').forEach(function (u) { if (u.parentId === id) out = out.concat(unitDescendants(u.id)); });
    return out;
  }

  /* ---------------- 菜单权限树（PRD-01） ---------------- */
  function menuTree() { return clone(DG.data.menus); }

  /* 递归收集所有叶子 id */
  function menuLeafIds(nodes, out) {
    out = out || [];
    (nodes || []).forEach(function (n) {
      if (n.children && n.children.length) menuLeafIds(n.children, out);
      else out.push(n.id);
    });
    return out;
  }

  /* ---------------- 角色 ---------------- */
  function rolesByPlatform(platform) {
    return list('roles').filter(function (r) { return r.platform === platform; });
  }

  /* 客户端：兼容旧的字符串值（如 'Web/APP'），统一转为数组 */
  function clientToArray(c) {
    if (Array.isArray(c)) return c.slice();
    if (c === null || c === undefined || c === '') return [];
    return String(c).split('/').filter(Boolean);
  }

  /* 客户端显示：数组 → 'Web/APP'，字符串原样 */
  function clientText(c) {
    if (Array.isArray(c)) return c.length ? c.join('/') : '—';
    return c || '—';
  }

  /* 角色排序：管理员 → 默认 → 自定义，同类型按更新时间降序 */
  function roleTypeOrder(t) {
    if (t === '管理员') return 0;
    if (t === '默认') return 1;
    return 2;
  }
  function sortRoles(roles) {
    return roles.slice().sort(function (a, b) {
      var d = roleTypeOrder(a.type) - roleTypeOrder(b.type);
      if (d !== 0) return d;
      return String(b.updateTime || '').localeCompare(String(a.updateTime || ''));
    });
  }

  /* ---------------- 用户 ---------------- */
  function usersByPlatform(platform) {
    return list('users').filter(function (u) { return u.platform === platform; });
  }

  /* 手机号全局唯一校验（PRD-02） */
  function phoneConflict(phone, excludeId) {
    var existing = list('users').filter(function (u) {
      return u.phone === phone && u.id !== excludeId;
    })[0];
    if (!existing) return null;
    if (existing.userType === 1 || existing.platform === 'jds') {
      return { type: 'jds', message: '该手机号已存在JDS账号' };
    }
    return { type: 'grid', message: '该手机号已存在数字网格用户' };
  }
  function phoneExists(phone, excludeId) {
    return !!phoneConflict(phone, excludeId);
  }

  /* 名称唯一校验（项目/工地全局唯一 PRD-03，单位项目内唯一 PRD-04） */
  function nameExists(key, name, excludeId, extraFilter) {
    return list(key).some(function (it) {
      if (it.id === excludeId) return false;
      if (extraFilter && !extraFilter(it)) return false;
      return it.name === name;
    });
  }

  /* ---------------- 登录 ---------------- */
  function loginByPhone(phone, password) {
    var acc = (DG.data.accounts || []).filter(function (a) { return a.phone === phone; })[0];
    if (!acc) return { ok: false, msg: '账号不存在' };
    if (acc.password !== password) return { ok: false, msg: '密码错误，演示密码为 123456' };
    var user = find('users', acc.userId);
    if (!user) return { ok: false, msg: '用户数据异常' };
    return { ok: true, user: user };
  }

  return {
    init: init,
    reset: reset,
    persist: persist,
    enums: DG.data.enums,
    list: list,
    find: find,
    add: add,
    update: update,
    remove: remove,
    nextId: nextId,
    paginate: paginate,
    options: options,
    withAll: withAll,
    nameOf: nameOf,
    projectName: projectName,
    siteName: siteName,
    unitName: unitName,
    unitTree: unitTree,
    unitDescendants: unitDescendants,
    menuTree: menuTree,
    menuLeafIds: menuLeafIds,
    rolesByPlatform: rolesByPlatform,
    clientToArray: clientToArray,
    clientText: clientText,
    sortRoles: sortRoles,
    usersByPlatform: usersByPlatform,
    phoneExists: phoneExists,
    phoneConflict: phoneConflict,
    nameExists: nameExists,
    loginByPhone: loginByPhone
  };
})();
