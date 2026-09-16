/* ===========================================================
   数字网格 Web · 项目端
   用户管理 / 角色管理 / 单位管理（左树右表）/ 用户设置
   侧栏为浅色（白底 + 主色高亮）
   =========================================================== */
window.DG = window.DG || {};
DG.views = DG.views || {};

DG.views.project = (function () {
  var UI = DG.ui, KIT = DG.kit, S = DG.store;
  var h = UI.h;

  function now() {
    var d = new Date(), p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function ctxProjectId() { return DG.app.state.projectId || 'p1'; }

  function unitOptions() {
    return S.list('units').filter(function (u) { return u.projectId === ctxProjectId(); })
      .map(function (u) { return { value: u.id, label: u.name + '（' + u.type + '）' }; });
  }
  function roleOptions() {
    return S.rolesByPlatform('project').map(function (r) { return { value: r.name, label: r.name }; });
  }
  function siteOptionsOfProject() {
    return S.list('sites').filter(function (s) { return s.projectId === ctxProjectId(); })
      .map(function (s) { return { value: s.id, label: s.name }; });
  }

  /* =========================================================
     1. 用户管理（PRD-02 · 项目端用户）
     列表：编号 / 名称（别名优先）/ 手机号 / 用户单位 / 关联角色 / 所属网格 / 创建时间 / 操作
     ========================================================= */
  function users() {
    function openForm(row) {
      var isEdit = !!row;
      KIT.formModal({
        title: isEdit ? '编辑用户' : '新增用户',
        size: '',
        docKey: 'project/users',
        values: isEdit ? {
          name: row.name, alias: row.alias, phone: row.phone, unitId: row.unitId,
          roles: row.roleNames.slice(), gender: row.gender, idCard: row.idCard, grid: row.grid
        } : { gender: '男', roles: [] },
        fields: [
          { key: 'name', label: '用户名称', type: 'input', required: true, maxLength: 10, placeholder: '≤10 字', tip: '用户名称可重名，同单位内用别名区分' },
          { key: 'alias', label: '别名', type: 'input', maxLength: 10, placeholder: '选填，列表中有别名时优先显示' },
          { key: 'phone', label: '手机号', type: 'input', required: true, maxLength: 11, placeholder: '11 位手机号', pattern: /^1\d{10}$/, message: '请输入正确的手机号' },
          { key: 'unitId', label: '用户单位', type: 'select', required: true, options: unitOptions(), tip: '项目端用户须关联业主 / 监理单位' },
          { key: 'roles', label: '关联角色', type: 'multiselect', required: true, options: roleOptions(), placeholder: '可多选' },
          { key: 'gender', label: '性别', type: 'radio', options: [{ value: '男', label: '男' }, { value: '女', label: '女' }] }
        ],
        onSubmit: function (v) {
          if (S.phoneExists(v.phone, isEdit ? row.id : null)) return { phone: '该手机号已存在' };
          var patch = {
            name: v.name, alias: v.alias, phone: v.phone,
            unitId: v.unitId, unitName: S.unitName(v.unitId),
            roleNames: v.roles, gender: v.gender,
            idCard: isEdit ? row.idCard : '', grid: isEdit ? row.grid : '',
            projectId: ctxProjectId()
          };
          if (isEdit) {
            S.update('users', row.id, patch); UI.toast('编辑成功', 'success');
          } else {
            var id = S.nextId('users', 'U');
            S.add('users', Object.assign({
              id: id, code: id, platform: 'project', siteId: '', projectSite: S.projectName(ctxProjectId()),
              createTime: now(), userType: 2
            }, patch));
            UI.toast('新增成功', 'success');
          }
          api.reload();
        }
      });
    }

    var api = KIT.listPage({
      title: '用户管理',
      sub: '项目端用户 · 单位=业主/监理',
      filters: [
        { key: 'keyword', type: 'input', placeholder: '名称 / 别名 / 手机号', width: 200 },
        { key: 'unitId', type: 'select', label: '单位', options: unitOptions(), allText: '全部单位', width: 180 },
        { key: 'role', type: 'select', label: '角色', options: roleOptions(), width: 150 }
      ],
      columns: [
        { title: '编号', key: 'code', width: 90 },
        {
          title: '用户名称', width: 140,
          render: function (r) {  /* 别名优先展示 */
            return h('div', { class: 'flex items-center gap-sm' }, [
              h('span', { text: r.alias || r.name }),
              r.alias ? h('span', { class: 'text-xs muted', text: '（' + r.name + '）' }) : null
            ]);
          }
        },
        { title: '手机号', key: 'phone', width: 130 },
        { title: '用户单位', key: 'unitName', width: 180 },
        { title: '关联角色', width: 160, render: function (r) { return (r.roleNames || []).join('、') || '—'; } },
        { title: '所属网格', key: 'grid', width: 120 },
        { title: '创建时间', key: 'createTime', width: 160 },
        {
          title: '操作', width: 140,
          render: function (r) {
            return KIT.ops([
              { text: '编辑', onClick: function () { openForm(r); } },
              {
                text: '删除', danger: true, onClick: function () {
                  KIT.confirmDelete('用户', function () {
                    S.remove('users', r.id); UI.toast('删除成功', 'success'); api.reload();
                  }, { name: r.name, tip: '删除后该用户将无法登录本项目端。' });
                }
              }
            ]);
          }
        }
      ],
      load: function (p) {
        return S.usersByPlatform('project').filter(function (u) {
          if (u.projectId && u.projectId !== ctxProjectId()) return false;
          if (p.keyword) {
            var kw = String(p.keyword).trim();
            if (u.name.indexOf(kw) < 0 && (u.alias || '').indexOf(kw) < 0 && u.phone.indexOf(kw) < 0) return false;
          }
          if (p.unitId && u.unitId !== p.unitId) return false;
          if (p.role && (u.roleNames || []).indexOf(p.role) < 0) return false;
          return true;
        });
      },
      addButton: { text: '+ 新增用户', onClick: function () { openForm(null); } }
    });
    api.openForm = openForm;
    return api;
  }

  /* =========================================================
     2. 角色管理（PRD-01 · 项目端）
     ========================================================= */
  function roles() {
    function openPerm(role) {
      if (role.type === '管理员') { UI.toast('管理员角色不可编辑权限', 'warning'); return; }
      var tr = UI.tree({
        nodes: S.menuTree(), checkable: true,
        checked: role.menuIds || [], allSelected: role.allSelectMenuIds || [],
        expandAll: true
      });
      UI.modal({
        title: '权限配置 · ' + role.name,
        body: h('div', {}, [
          h('div', { class: 'flex gap-sm mb-md' }, [
            h('button', { class: 'btn btn-text', type: 'button', onclick: function () { tr.checkAll(); } }, '全选'),
            h('button', { class: 'btn btn-text', type: 'button', onclick: function () { tr.uncheckAll(); } }, '清空')
          ]),
          h('div', { style: { maxHeight: '360px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px' } }, tr)
        ]),
        onOk: function () {
          var patch = { menuIds: tr.getChecked(), allSelectMenuIds: tr.getAllSelected(), updateTime: now() };
          if (role.type === '默认') patch.synced = false;
          S.update('roles', role.id, patch);
          UI.toast(role.type === '默认' ? '权限已保存，请重新同步至工地' : '权限已保存', 'success');
          api.reload();
        }
      });
    }

    function openBindUsers(role) {
      var users = S.usersByPlatform('project').filter(function (u) { return u.projectId === ctxProjectId(); });
      var opts = users.map(function (u) {
        return { value: u.id, label: (u.alias || u.name), sub: u.phone, meta: (u.roleNames && u.roleNames.length) ? u.roleNames.join('、') : '未分配角色' };
      });
      var cl = UI.transferList({ options: opts, value: role.userIds || [], height: '420px' });
      UI.modal({
        title: '关联用户 · ' + role.name + '（当前项目共 ' + users.length + ' 人）',
        size: 'lg',
        body: cl,
        onOk: function () {
          var ids = cl.getValue();
          S.update('roles', role.id, { userIds: ids, userCount: ids.length, updateTime: now() });
          UI.toast('已关联 ' + ids.length + ' 名用户', 'success'); api.reload();
        }
      });
    }

    /* 同步至工地（默认角色 → 大弹窗多选，覆盖式同步） */
    function syncToSite(role) {
      var sites = S.list('sites').filter(function (s) { return s.projectId === ctxProjectId(); });
      if (!sites.length) { UI.toast('当前项目下暂无工地', 'warning'); return; }
      var defaultIds = role.syncedSiteIds && role.syncedSiteIds.length
        ? role.syncedSiteIds.slice()
        : (role.synced ? sites.map(function (s) { return s.id; }) : []);
      var cl = UI.checkboxList({
        options: sites.map(function (s) {
          return {
            value: s.id,
            label: s.name,
            sub: '所属项目：' + S.projectName(s.projectId),
            meta: '工地状态：' + (s.siteStatus || '—') + (s.trialEnd ? ' · 试用至 ' + s.trialEnd : '')
          };
        }),
        value: defaultIds,
        searchable: true,
        height: '420px'
      });
      UI.modal({
        title: '同步至工地 · ' + role.name,
        size: 'lg',
        body: h('div', {}, [
          h('div', { class: 'field-tip mb-md', text: '请选择需要同步的工地，可多选。同步为覆盖式：目标工地的同名默认角色将被覆盖（按 PRD-01）。' }),
          cl
        ]),
        onOk: function () {
          var ids = cl.getValue();
          if (!ids.length) { UI.toast('请至少选择一个工地', 'warning'); return false; }
          S.update('roles', role.id, { synced: true, syncedSiteIds: ids, updateTime: now() });
          UI.toast('已同步「' + role.name + '」至 ' + ids.length + ' 个工地', 'success');
          api.reload();
        }
      });
    }

    function openForm(row) {
      var isEdit = !!row;
      KIT.formModal({
        title: isEdit ? '编辑角色' : '新增角色',
        docKey: 'project/roles',
        values: isEdit ? {
          name: row.name, type: row.type, client: S.clientToArray(row.client),
          unitId: row.unitId || '', remark: row.remark || '',
          menu: { checked: row.menuIds || [], allSelected: row.allSelectMenuIds || [] }
        } : { type: '自定义', client: ['Web', 'APP'], menu: { checked: [], allSelected: [] } },
        fields: [
          { key: 'name', label: '角色名称', type: 'input', required: true, maxLength: 20, tip: '角色名称在项目内唯一' },
          { key: 'type', label: '角色类型', type: 'select', required: true, options: [{ value: '默认', label: '默认' }, { value: '自定义', label: '自定义' }], tip: '默认角色创建后自动同步各工地' },
          { key: 'client', label: '可用客户端', type: 'multiselect', required: true, options: [{ value: 'Web', label: 'Web' }, { value: 'APP', label: 'APP' }] },
          {
            key: 'unitId', label: '关联单位', type: 'select', required: true, options: unitOptions(),
            showIf: { key: 'type', test: function (v) { return v === '自定义'; } },
            tip: '自定义角色需关联单位（业主 / 监理）'
          },
          { key: 'menu', label: '菜单权限', type: 'tree', nodes: S.menuTree() },
          { key: 'remark', label: '备注', type: 'textarea', maxLength: 200 }
        ],
        onSubmit: function (v) {
          if (S.nameExists('roles', v.name, isEdit ? row.id : null, function (r) { return r.platform === 'project'; })) {
            return { name: '角色名称已存在' };
          }
          var patch = {
            name: v.name, type: v.type, client: v.client,
            unitId: v.unitId, unitName: v.unitId ? S.unitName(v.unitId) : '',
            remark: v.remark, menuIds: v.menu.checked, allSelectMenuIds: v.menu.allSelected, updateTime: now()
          };
          if (isEdit) {
            S.update('roles', row.id, patch); UI.toast('编辑成功', 'success');
          } else {
            S.add('roles', Object.assign({
              id: S.nextId('roles', 'r'), platform: 'project', builtin: false,
              userCount: 0, synced: v.type === '默认', canEdit: true, canDelete: true, createTime: now()
            }, patch));
            UI.toast('新增成功', 'success');
          }
          api.reload();
        }
      });
    }

    var api = KIT.listPage({
      title: '角色管理',
      sub: '项目端 · 默认角色 / 项目自定义角色 / 管理员（内置）',
      filters: [
        { key: 'keyword', type: 'input', placeholder: '角色名称', width: 200 },
        { key: 'type', type: 'select', label: '类型', options: [{ value: '默认', label: '默认' }, { value: '自定义', label: '自定义' }, { value: '管理员', label: '管理员' }], width: 150 }
      ],
      columns: [
        {
          title: '角色名称', width: 170,
          render: function (r) {
            return h('div', { class: 'flex items-center gap-sm' }, [
              h('span', { text: r.name }),
              r.builtin ? UI.tag('内置', 'info') : null
            ]);
          }
        },
        { title: '角色类型', width: 110, render: function (r) { return UI.tag(r.type || '—', r.type === '管理员' ? 'primary' : (r.type === '默认' ? 'info' : 'default')); } },
        { title: '可用客户端', width: 120, render: function (r) { return S.clientText(r.client); } },
        { title: '关联单位', key: 'unitName', width: 170 },
        { title: '关联用户', width: 100, render: function (r) { return (r.userCount || 0) + ' 人'; } },
        {
          title: '同步状态', width: 110,
          render: function (r) { return r.type === '默认' ? UI.tag(r.synced ? '已同步' : '未同步', r.synced ? 'success' : 'warning') : '—'; }
        },
        { title: '更新时间', key: 'updateTime', width: 150 },
        {
          title: '操作', width: 300,
          render: function (r) {
            var links;
            if (r.type === '管理员') {
              links = [];
              var isJdsUser = DG.app.state.user && DG.app.state.user.userType === 1;
              if (isJdsUser) links.push({ text: '关联用户', onClick: function () { openBindUsers(r); } });
              return KIT.ops(links);
            }
            links = [
              { text: '权限配置', onClick: function () { openPerm(r); } },
              { text: '关联用户', onClick: function () { openBindUsers(r); } }
            ];
            if (r.type === '默认') links.push({ text: '同步至工地', onClick: function () { syncToSite(r); } });
            links.push({ text: '编辑', onClick: function () { openForm(r); } });
            if (!r.builtin) links.push({
              text: '删除', danger: true, onClick: function () {
                KIT.confirmDelete('角色', function () {
                  S.remove('roles', r.id); UI.toast('删除成功', 'success'); api.reload();
                }, { name: r.name });
              }
            });
            return KIT.ops(links);
          }
        }
      ],
      load: function (p) {
        return S.sortRoles(S.rolesByPlatform('project').filter(function (r) {
          if (p.keyword && r.name.indexOf(String(p.keyword).trim()) < 0) return false;
          if (p.type && r.type !== p.type) return false;
          return true;
        }));
      },
      addButton: { text: '+ 新增角色', onClick: function () { openForm(null); } }
    });
    api.openForm = openForm;
    api.openPerm = openPerm;
    return api;
  }

  /* =========================================================
     3. 单位管理（PRD-04）· 树形表格（新增仅一级，行内添加下级）
     ========================================================= */
  function units() {
    var root = h('div', { class: 'flex-col', style: { height: '100%' } });
    var params = {};
    var expanded = {}; /* 记录展开/收起状态 */
    var filterControls = {};

    function buildFilters() {
      var bar = h('div', { class: 'filter-bar' });
      var kw = h('input', { class: 'input', type: 'text', placeholder: '单位名称', style: { width: '180px' } });
      kw.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(); });
      filterControls.keyword = kw;

      var typeSel = UI.select({
        value: '', options: S.withAll(S.enums.unitType.map(function (t) { return { value: t, label: t }; }), '全部类型'), width: 140
      });
      filterControls.type = typeSel;

      var statusSel = UI.select({
        value: '', options: S.withAll([{ value: '启用', label: '启用' }, { value: '停用', label: '停用' }], '全部状态'), width: 140
      });
      filterControls.status = statusSel;

      bar.appendChild(kw);
      bar.appendChild(typeSel);
      bar.appendChild(statusSel);
      bar.appendChild(h('div', { class: 'filter-actions' }, [
        h('button', { class: 'btn btn-primary', type: 'button', onclick: doSearch }, '查询'),
        h('button', {
          class: 'btn', type: 'button',
          onclick: function () {
            kw.value = ''; typeSel.setValue(''); statusSel.setValue('');
            params = {}; render();
          }
        }, '重置')
      ]));
      return bar;
    }

    function doSearch() {
      params = { keyword: filterControls.keyword.value, type: filterControls.type.getValue(), status: filterControls.status.getValue() };
      render();
    }

    /* 递归遍历，生成树形行列表 */
    function flattenTree(nodes, depth) {
      var rows = [];
      nodes.forEach(function (n) {
        rows.push({ data: n, depth: depth });
        var subs = S.list('units').filter(function (u) { return u.parentId === n.id; });
        if (subs.length && expanded[n.id]) {
          rows = rows.concat(flattenTree(subs, depth + 1));
        }
      });
      return rows;
    }

    function loadRows() {
      var all = S.list('units').filter(function (u) {
        if (u.projectId !== ctxProjectId()) return false;
        if (u.parentId) return false; /* 仅加载一级单位 */
        if (params.keyword && u.name.indexOf(String(params.keyword).trim()) < 0) return false;
        if (params.type && u.type !== params.type) return false;
        if (params.status && u.status !== params.status) return false;
        return true;
      });
      return flattenTree(all, 0);
    }

    function render() {
      UI.clear(root);
      root.appendChild(h('div', { class: 'page-head' }, [
        h('div', {}, [
          h('div', { class: 'page-title', text: '单位管理' }),
          h('div', { class: 'page-sub', text: '项目端 · 树形单位列表（单位类型：业主 / 监理）' })
        ])
      ]));

      var card = h('div', { class: 'card card-no-pad' }, [
        h('div', { class: 'card-toolbar' }, [
          h('div', { class: 'ct-title', text: '单位列表' }),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { openForm(null, null); } }, '+ 新增单位')
        ]),
        h('div', { class: 'card-body' }, [
          UI.table({
            columns: [
              {
                title: '单位名称', width: 220,
                render: function (row) {
                  var u = row.data;
                  var subs = S.list('units').filter(function (x) { return x.parentId === u.id; });
                  var hasChild = subs.length > 0;
                  var indent = 16 + row.depth * 20;
                  var isOpen = !!expanded[u.id];
                  return h('div', { style: { paddingLeft: indent + 'px', display: 'flex', alignItems: 'center', gap: '8px' } }, [
                    hasChild ? h('span', {
                      class: 'tree-arrow' + (isOpen ? ' is-open' : ''),
                      style: { cursor: 'pointer', fontSize: '10px', width: '16px', textAlign: 'center', color: '#606266' },
                      onclick: function (e) { e.stopPropagation(); expanded[u.id] = !isOpen; render(); }
                    }, '▶') : h('span', { style: { width: '16px' } }),
                    h('span', { text: u.name })
                  ]);
                }
              },
              { title: '类型', width: 90, render: function (row) { return UI.tag(row.data.type, row.data.type === '业主' ? 'primary' : 'info'); } },
              { title: '关联工地', width: 170, render: function (row) { return row.data.siteId ? S.siteName(row.data.siteId) : '—'; } },
              { title: '关联人数', width: 100, render: function (row) { return row.data.memberCount + ' 人'; } },
              { title: '状态', width: 90, render: function (row) { return UI.statusTag(row.data.status); } },
              {
                title: '操作', width: 260,
                render: function (row) {
                  var u = row.data;
                  var subs = S.list('units').filter(function (x) { return x.parentId === u.id; });
                  var ops = [
                    {
                      text: u.status === '启用' ? '停用' : '启用',
                      onClick: function () {
                        S.update('units', u.id, { status: u.status === '启用' ? '停用' : '启用' });
                        UI.toast(u.status === '启用' ? '已停用' : '已启用', 'success');
                        render();
                      }
                    },
                    { text: '编辑', onClick: function () { openForm(u, null); } },
                    { text: '添加下级', onClick: function () { openForm(null, u.id); } }
                  ];
                  /* 删除按钮仅在无子级时显示 */
                  if (!subs.length) {
                    ops.push({
                      text: '删除', danger: true, onClick: function () {
                        if (u.memberCount > 0) { UI.toast('存在关联用户，无法删除', 'error'); return; }
                        KIT.confirmDelete('单位', function () {
                          S.remove('units', u.id);
                          UI.toast('删除成功', 'success');
                          render();
                        }, { name: u.name });
                      }
                    });
                  }
                  return KIT.ops(ops);
                }
              }
            ],
            rows: loadRows(),
            empty: '暂无单位数据'
          })
        ])
      ]);

      root.appendChild(h('div', { class: 'page-body' }, [
        buildFilters(),
        card
      ]));
    }

    /* 新增 / 编辑单位（parentIdForNew: 新增时的父级 ID，null 表示新增一级） */
    function openForm(rowToEdit, parentIdForNew) {
      var isEdit = !!rowToEdit;
      var parentId = isEdit ? rowToEdit.parentId : parentIdForNew;
      KIT.formModal({
        title: isEdit ? '编辑单位' : ('新增' + (parentId ? '下级' : '一级') + '单位'),
        docKey: 'project/units',
        values: isEdit ? {
          name: rowToEdit.name, type: rowToEdit.type, siteId: rowToEdit.siteId || '', remark: rowToEdit.remark || ''
        } : { type: '业主' },
        fields: [
          { key: 'name', label: '单位名称', type: 'input', required: true, maxLength: 20, placeholder: '≤20 字' },
          { key: 'type', label: '单位类型', type: 'select', required: true, options: S.enums.unitType.map(function (t) { return { value: t, label: t }; }) },
          { key: 'siteId', label: '关联工地', type: 'select', options: [{ value: '', label: '不关联' }].concat(siteOptionsOfProject()) },
          { key: 'remark', label: '备注', type: 'textarea', maxLength: 200, placeholder: '≤200 字' }
        ],
        onSubmit: function (v) {
          if (S.nameExists('units', v.name, isEdit ? rowToEdit.id : null, function (u) { return u.projectId === ctxProjectId(); })) {
            return { name: '单位名称已存在' };
          }
          var patch = { name: v.name, type: v.type, siteId: v.siteId, remark: v.remark };
          if (isEdit) {
            S.update('units', rowToEdit.id, patch); UI.toast('编辑成功', 'success');
          } else {
            S.add('units', Object.assign({
              id: S.nextId('units', 'u'),
              parentId: parentId || null,
              projectId: ctxProjectId(),
              memberCount: 0, status: '启用', createTime: now()
            }, patch));
            UI.toast('新增成功', 'success');
          }
          render();
        }
      });
    }

    render();
    return { el: root, reload: render, openForm: openForm };
  }

  /* =========================================================
     4. 用户设置（切换端）
     ========================================================= */
  function settings() {
    var root = h('div', {});
    function render() {
      UI.clear(root);
      var user = DG.app.state.user || {};
      root.appendChild(h('div', { class: 'page-head' }, [
        h('div', {}, [
          h('div', { class: 'page-title', text: '用户设置' }),
          h('div', { class: 'page-sub', text: user.userType === 1 ? '切换端别、项目与账号信息' : '账号信息' })
        ])
      ]));

      root.appendChild(h('div', { class: 'card', style: { maxWidth: '640px' } }, [
        h('div', { class: 'desc-list' }, [
          h('div', { class: 'desc-item' }, [h('span', { class: 'k', text: '用户名称' }), h('span', { class: 'v', text: (user.alias || user.name || '—') })]),
          h('div', { class: 'desc-item' }, [h('span', { class: 'k', text: '手机号' }), h('span', { class: 'v', text: user.phone || '—' })]),
          h('div', { class: 'desc-item' }, [h('span', { class: 'k', text: '当前端别' }), h('span', { class: 'v' }, UI.tag('项目端', 'primary'))]),
          h('div', { class: 'desc-item' }, [h('span', { class: 'k', text: '当前项目' }), h('span', { class: 'v', text: S.projectName(ctxProjectId()) })]),
          h('div', { class: 'desc-item' }, [h('span', { class: 'k', text: '用户单位' }), h('span', { class: 'v', text: user.unitName || '—' })]),
          h('div', { class: 'desc-item' }, [h('span', { class: 'k', text: '所属网格' }), h('span', { class: 'v', text: user.grid || '—' })])
        ]),
        h('div', { class: 'mt-xl flex gap-md' }, [
          user.userType === 1 ? h('button', {
            class: 'btn btn-primary', type: 'button',
            onclick: function () { DG.app.switchPlatform('site'); }
          }, '切换到工地端') : null,
          h('button', {
            class: 'btn', type: 'button',
            onclick: function () {
              UI.confirm({
                title: '退出登录', content: '确认退出当前账号？', okText: '退出',
                onOk: function () { DG.app.logout(); }
              });
            }
          }, '退出登录')
        ])
      ]));
    }
    render();
    return { el: root, reload: render };
  }

  return {
    users: users,
    roles: roles,
    units: units,
    settings: settings
  };
})();
