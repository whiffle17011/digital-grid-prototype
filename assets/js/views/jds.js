/* ===========================================================
   数字化管理平台（JDS）· 四个模块
   用户管理 / 角色管理 / 项目管理 / 工地管理
   侧栏为深色（#001529）
   =========================================================== */
window.DG = window.DG || {};
DG.views = DG.views || {};

DG.views.jds = (function () {
  var UI = DG.ui, KIT = DG.kit, S = DG.store;
  var h = UI.h;

  /* ---------------- 公共选项 ---------------- */
  function roleOptions(platform) {
    return S.rolesByPlatform(platform).map(function (r) { return { value: r.name, label: r.name }; });
  }
  function projectOptions() {
    return S.list('projects').map(function (p) { return { value: p.id, label: p.name }; });
  }
  function siteOptions() {
    return S.list('sites').map(function (s) { return { value: s.id, label: s.name }; });
  }

  /* 复制角色：管理员不复制，默认和自定义角色均可复制，关联用户不复制，同名覆盖角色配置但保留目标用户关联 */
  function copyCustomRoles(sourcePlatform, sourceId, targetPlatform, targetId) {
    var sourceKey = sourcePlatform === 'project' ? 'projectId' : 'siteId';
    var targetKey = targetPlatform === 'project' ? 'projectId' : 'siteId';
    var sourceRoles = S.list('roles').filter(function (r) {
      return r.platform === sourcePlatform && r.type !== '管理员' && r[sourceKey] === sourceId;
    });
    if (!sourceRoles.length) {
      sourceRoles = S.list('roles').filter(function (r) {
        return r.platform === sourcePlatform && r.type !== '管理员';
      });
    }
    var copied = 0;
    sourceRoles.forEach(function (src) {
      var existing = S.list('roles').filter(function (r) {
        return r.platform === targetPlatform && r[targetKey] === targetId && r.name === src.name;
      })[0];
      var patch = {
        name: src.name, alias: src.alias || '', type: src.type, builtin: false,
        platform: targetPlatform, client: src.client, unitId: src.unitId || '',
        unitName: src.unitName || '', remark: src.remark || '',
        menuIds: (src.menuIds || []).slice(),
        allSelectMenuIds: (src.allSelectMenuIds || []).slice(),
        canEdit: true, canDelete: true,
        source: src.type === '默认'
          ? (targetPlatform === 'site' ? '项目同步' : '复制角色')
          : (targetPlatform === 'site' ? '工地自定义' : '复制角色'),
        synced: src.type === '默认' ? false : src.synced,
        updateTime: now()
      };
      patch[targetKey] = targetId;
      if (targetPlatform === 'site') patch.projectId = src.projectId || '';
      if (existing) {
        S.update('roles', existing.id, Object.assign({}, patch, {
          userIds: (existing.userIds || []).slice(),
          userCount: existing.userCount || 0,
          createTime: existing.createTime || now()
        }));
      } else {
        S.add('roles', Object.assign({ id: S.nextId('roles', 'r'), createTime: now(), userIds: [], userCount: 0 }, patch));
      }
      copied += 1;
    });
    return copied;
  }

  /* 将 menu_ids 转为按客户端分组的详情展示 */
  function menuDetailNode(menuIds) {
    var selected = menuIds || [];
    var groups = [];
    S.menuTree().forEach(function (group) {
      var items = [];
      (group.children || []).forEach(function (node) {
        var selectedNode = selected.indexOf(node.id) >= 0;
        var selectedOps = (node.children || []).filter(function (op) { return selected.indexOf(op.id) >= 0; });
        if (!selectedNode && !selectedOps.length) return;
        items.push(h('div', { class: 'menu-detail-item' }, [
          h('span', { class: 'menu-detail-name', text: node.name }),
          h('span', { class: 'menu-detail-ops', text: selectedNode ? '全部操作' : selectedOps.map(function (op) { return op.name; }).join('、') })
        ]));
      });
      if (items.length) groups.push(h('div', { class: 'menu-detail-group' }, [
        h('div', { class: 'menu-detail-client', text: group.name }),
        h('div', { class: 'menu-detail-list' }, items)
      ]));
    });
    return h('div', { class: 'menu-detail' }, [
      h('div', { class: 'text-bold mb-lg', text: '菜单详情' }),
      groups.length ? h('div', { class: 'menu-detail-groups' }, groups) : h('div', { class: 'text-sm muted', text: '未配置菜单权限' })
    ]);
  }
  /* 关联项目 / 工地弹窗（JDS 用户字段）—— 左右两个并行列表 */
  function openProjectSiteModal(row, onChange) {
    var projects = S.list('projects');
    var sites = S.list('sites');
    var selProjects = (row && row.projectIds ? row.projectIds.slice() : (row && row.projectId ? [row.projectId] : []));
    var selSites = (row && row.siteIds ? row.siteIds.slice() : (row && row.siteId ? [row.siteId] : []));

    /* 项目列表（多选复选框） */
    var projList = h('div', { class: 'ps-list' });
    function renderProjects() {
      UI.clear(projList);
      if (!projects.length) { projList.appendChild(h('div', { class: 'cb-list-empty', text: '暂无项目' })); return; }
      projects.forEach(function (p) {
        var checked = selProjects.indexOf(p.id) >= 0;
        var rowSiteCount = sites.filter(function (s) { return s.projectId === p.id; }).length;
        var row = h('label', { class: 'cb-list-row' + (checked ? ' is-checked' : '') }, [
          h('span', { class: 'cb-list-box' }, checked ? '✓' : ''),
          h('div', { class: 'cb-list-main' }, [
            h('div', { class: 'cb-list-label', text: p.name }),
            h('div', { class: 'cb-list-sub', text: '下辖工地 ' + rowSiteCount + ' 个' })
          ])
        ]);
        row.addEventListener('click', function (e) {
          e.preventDefault();
          var i = selProjects.indexOf(p.id);
          if (i >= 0) selProjects.splice(i, 1); else selProjects.push(p.id);
          renderProjects(); renderSites();
          updateHint();
        });
        projList.appendChild(row);
      });
    }

    /* 工地列表（按项目分组，嵌套复选框） */
    var siteList = h('div', { class: 'ps-list' });
    function renderSites() {
      UI.clear(siteList);
      var grouped = {}; var standalone = [];
      sites.forEach(function (s) {
        if (s.projectId) { (grouped[s.projectId] = grouped[s.projectId] || []).push(s); }
        else { standalone.push(s); }
      });
      projects.forEach(function (p) {
        var groupSites = grouped[p.id] || [];
        if (!groupSites.length) return;
        var groupBox = h('div', { class: 'ps-group' });
        groupBox.appendChild(h('div', { class: 'ps-group-title', text: p.name }));
        groupSites.forEach(function (s) {
          var checked = selSites.indexOf(s.id) >= 0;
          var r = h('label', { class: 'cb-list-row' + (checked ? ' is-checked' : '') }, [
            h('span', { class: 'cb-list-box' }, checked ? '✓' : ''),
            h('div', { class: 'cb-list-main' }, [
              h('div', { class: 'cb-list-label', text: s.name }),
              h('div', { class: 'cb-list-sub', text: s.siteStatus || '—' + (s.trialEnd ? ' · 试用至 ' + s.trialEnd : '') })
            ])
          ]);
          r.addEventListener('click', function (e) {
            e.preventDefault();
            var i = selSites.indexOf(s.id);
            if (i >= 0) selSites.splice(i, 1); else selSites.push(s.id);
            renderSites(); updateHint();
          });
          groupBox.appendChild(r);
        });
        siteList.appendChild(groupBox);
      });
      if (standalone.length) {
        var groupBox = h('div', { class: 'ps-group' });
        groupBox.appendChild(h('div', { class: 'ps-group-title', text: '独立工地（无所属项目）' }));
        standalone.forEach(function (s) {
          var checked = selSites.indexOf(s.id) >= 0;
          var r = h('label', { class: 'cb-list-row' + (checked ? ' is-checked' : '') }, [
            h('span', { class: 'cb-list-box' }, checked ? '✓' : ''),
            h('div', { class: 'cb-list-main' }, [
              h('div', { class: 'cb-list-label', text: s.name }),
              h('div', { class: 'cb-list-sub', text: '独立工地 · ' + (s.siteStatus || '—') })
            ])
          ]);
          r.addEventListener('click', function (e) {
            e.preventDefault();
            var i = selSites.indexOf(s.id);
            if (i >= 0) selSites.splice(i, 1); else selSites.push(s.id);
            renderSites(); updateHint();
          });
          groupBox.appendChild(r);
        });
        siteList.appendChild(groupBox);
      }
      if (!siteList.children.length) siteList.appendChild(h('div', { class: 'cb-list-empty', text: kw ? '暂无匹配工地' : '暂无工地' }));
    }

    var hint = h('div', { class: 'field-tip', text: '' });
    function updateHint() {
      hint.innerHTML = '已选 <b>' + selProjects.length + '</b> 个项目，<b>' + selSites.length + '</b> 个工地';
    }

    var body = h('div', { class: 'ps-modal' }, [
      h('div', { class: 'ps-grid' }, [
        h('div', { class: 'ps-col' }, [
          h('div', { class: 'ps-col-title flex items-center' }, [
            h('span', { text: '项目' }),
            h('div', { style: { marginLeft: 'auto', display: 'flex', gap: '8px' } }, [
              h('button', { class: 'btn btn-text', type: 'button', onclick: function () { selProjects = projects.map(function (p) { return p.id; }); renderProjects(); renderSites(); updateHint(); } }, '全选'),
              h('button', { class: 'btn btn-text', type: 'button', onclick: function () { selProjects = []; renderProjects(); renderSites(); updateHint(); } }, '清空')
            ])
          ]),
          projList
        ]),
        h('div', { class: 'ps-col' }, [
          h('div', { class: 'ps-col-title flex items-center' }, [
            h('span', { text: '工地（按项目分组）' }),
            h('div', { style: { marginLeft: 'auto', display: 'flex', gap: '8px' } }, [
              h('button', { class: 'btn btn-text', type: 'button', onclick: function () { selSites = sites.map(function (s) { return s.id; }); renderSites(); updateHint(); } }, '全选'),
              h('button', { class: 'btn btn-text', type: 'button', onclick: function () { selSites = []; renderSites(); updateHint(); } }, '清空')
            ])
          ]),
          siteList
        ])
      ]),
      hint
    ]);

    renderProjects(); renderSites(); updateHint();

    UI.modal({
      title: '关联项目 / 工地 · ' + (row ? row.name : ''),
      size: '',
      body: body,
      onOk: function () {
        if (onChange) onChange({ projectIds: selProjects.slice(), siteIds: selSites.slice() });
      }
    });
  }

  /* 列表列展示用：拼接已关联项目/工地 */
  function projectSiteText(u) {
    var pIds = (u.projectIds && u.projectIds.length) ? u.projectIds : (u.projectId ? [u.projectId] : []);
    var sIds = (u.siteIds && u.siteIds.length) ? u.siteIds : (u.siteId ? [u.siteId] : []);
    var pText = pIds.length ? pIds.map(function (id) { return S.projectName(id); }).join('、') : '';
    var sText = sIds.length ? sIds.map(function (id) { return S.siteName(id); }).join('、') : '';
    var parts = [];
    if (pText) parts.push('项目：' + pText);
    if (sText) parts.push('工地：' + sText);
    return parts.length ? parts.join(' ／ ') : '—';
  }

  /* 关联项目弹窗（JDS 用户字段）—— 单选/多选项目 */
  function openProjectModal(row, onChange) {
    var projects = S.list('projects');
    var selProjects = (row && row.projectIds ? row.projectIds.slice() : (row && row.projectId ? [row.projectId] : []));

    /* 项目列表（多选复选框 + 搜索） */
    var projList = h('div', { class: 'ps-list' });
    var projSearch = h('input', { class: 'ps-search', type: 'text', placeholder: '搜索项目名称' });
    projSearch.addEventListener('input', renderProjects);
    function renderProjects() {
      UI.clear(projList);
      var kw = String(projSearch.value || '').trim().toLowerCase();
      var visible = projects.filter(function (p) { return !kw || String(p.name).toLowerCase().indexOf(kw) >= 0; });
      if (!visible.length) { projList.appendChild(h('div', { class: 'cb-list-empty', text: '暂无匹配项目' })); return; }
      visible.forEach(function (p) {
        var checked = selProjects.indexOf(p.id) >= 0;
        var rowSiteCount = S.list('sites').filter(function (s) { return s.projectId === p.id; }).length;
        var row = h('label', { class: 'cb-list-row' + (checked ? ' is-checked' : '') }, [
          h('span', { class: 'cb-list-box' }, checked ? '✓' : ''),
          h('div', { class: 'cb-list-main' }, [
            h('div', { class: 'cb-list-label', text: p.name }),
            h('div', { class: 'cb-list-sub', text: '下辖工地 ' + rowSiteCount + ' 个' })
          ])
        ]);
        row.addEventListener('click', function (e) {
          e.preventDefault();
          var i = selProjects.indexOf(p.id);
          if (i >= 0) selProjects.splice(i, 1); else selProjects.push(p.id);
          renderProjects();
          updateHint();
        });
        projList.appendChild(row);
      });
    }

    var hint = h('div', { class: 'field-tip', text: '' });
    function updateHint() {
      hint.innerHTML = '已选 <b>' + selProjects.length + '</b> 个项目';
    }

    var body = h('div', { class: 'ps-modal' }, [
      h('div', { class: 'ps-col' }, [
        h('div', { class: 'ps-col-title flex items-center' }, [
          h('span', { text: '项目' }),
          h('div', { style: { marginLeft: 'auto', display: 'flex', gap: '8px' } }, [
            h('button', { class: 'btn btn-text', type: 'button', onclick: function () { selProjects = projects.map(function (p) { return p.id; }); renderProjects(); updateHint(); } }, '全选'),
            h('button', { class: 'btn btn-text', type: 'button', onclick: function () { selProjects = []; renderProjects(); updateHint(); } }, '清空')
          ])
        ]),
        projSearch,
        projList
      ]),
      hint
    ]);

    renderProjects();
    updateHint();

    UI.modal({
      title: '关联项目 · ' + (row ? row.name : ''),
      size: '',
      body: body,
      onOk: function () {
        if (onChange) onChange(selProjects.slice());
      }
    });
  }

  /* 关联工地弹窗（JDS 用户字段）—— 按项目分组 */
  function openSiteModal(row, onChange) {
    var sites = S.list('sites');
    var projects = S.list('projects');
    var selSites = (row && row.siteIds ? row.siteIds.slice() : (row && row.siteId ? [row.siteId] : []));

    /* 工地列表（按项目分组，嵌套复选框 + 搜索） */
    var siteList = h('div', { class: 'ps-list' });
    var siteSearch = h('input', { class: 'ps-search', type: 'text', placeholder: '搜索工地名称 / 相似名 / 所属项目' });
    siteSearch.addEventListener('input', renderSites);
    function renderSites() {
      UI.clear(siteList);
      var kw = String(siteSearch.value || '').trim().toLowerCase();
      var visibleSites = sites.filter(function (s) {
        if (!kw) return true;
        return String(s.name || '').toLowerCase().indexOf(kw) >= 0
          || String(s.similarName || '').toLowerCase().indexOf(kw) >= 0
          || String(S.projectName(s.projectId) || '').toLowerCase().indexOf(kw) >= 0;
      });
      var grouped = {}; var standalone = [];
      visibleSites.forEach(function (s) {
        if (s.projectId) { (grouped[s.projectId] = grouped[s.projectId] || []).push(s); }
        else { standalone.push(s); }
      });
      projects.forEach(function (p) {
        var groupSites = grouped[p.id] || [];
        if (!groupSites.length) return;
        var groupBox = h('div', { class: 'ps-group' });
        groupBox.appendChild(h('div', { class: 'ps-group-title', text: p.name }));
        groupSites.forEach(function (s) {
          var checked = selSites.indexOf(s.id) >= 0;
          var r = h('label', { class: 'cb-list-row' + (checked ? ' is-checked' : '') }, [
            h('span', { class: 'cb-list-box' }, checked ? '✓' : ''),
            h('div', { class: 'cb-list-main' }, [
              h('div', { class: 'cb-list-label', text: s.name }),
              h('div', { class: 'cb-list-sub', text: s.siteStatus || '—' + (s.trialEnd ? ' · 试用至 ' + s.trialEnd : '') })
            ])
          ]);
          r.addEventListener('click', function (e) {
            e.preventDefault();
            var i = selSites.indexOf(s.id);
            if (i >= 0) selSites.splice(i, 1); else selSites.push(s.id);
            renderSites(); updateHint();
          });
          groupBox.appendChild(r);
        });
        siteList.appendChild(groupBox);
      });
      if (standalone.length) {
        var groupBox = h('div', { class: 'ps-group' });
        groupBox.appendChild(h('div', { class: 'ps-group-title', text: '独立工地（无所属项目）' }));
        standalone.forEach(function (s) {
          var checked = selSites.indexOf(s.id) >= 0;
          var r = h('label', { class: 'cb-list-row' + (checked ? ' is-checked' : '') }, [
            h('span', { class: 'cb-list-box' }, checked ? '✓' : ''),
            h('div', { class: 'cb-list-main' }, [
              h('div', { class: 'cb-list-label', text: s.name }),
              h('div', { class: 'cb-list-sub', text: '独立工地 · ' + (s.siteStatus || '—') })
            ])
          ]);
          r.addEventListener('click', function (e) {
            e.preventDefault();
            var i = selSites.indexOf(s.id);
            if (i >= 0) selSites.splice(i, 1); else selSites.push(s.id);
            renderSites(); updateHint();
          });
          groupBox.appendChild(r);
        });
        siteList.appendChild(groupBox);
      }
      if (!siteList.children.length) siteList.appendChild(h('div', { class: 'cb-list-empty', text: kw ? '暂无匹配工地' : '暂无工地' }));
    }

    var hint = h('div', { class: 'field-tip', text: '' });
    function updateHint() {
      hint.innerHTML = '已选 <b>' + selSites.length + '</b> 个工地';
    }

    var body = h('div', { class: 'ps-modal' }, [
      h('div', { class: 'ps-col' }, [
        h('div', { class: 'ps-col-title flex items-center' }, [
          h('span', { text: '工地（按项目分组）' }),
          h('div', { style: { marginLeft: 'auto', display: 'flex', gap: '8px' } }, [
            h('button', { class: 'btn btn-text', type: 'button', onclick: function () { selSites = sites.map(function (s) { return s.id; }); renderSites(); updateHint(); } }, '全选'),
            h('button', { class: 'btn btn-text', type: 'button', onclick: function () { selSites = []; renderSites(); updateHint(); } }, '清空')
          ])
        ]),
        siteSearch,
        siteList
      ]),
      hint
    ]);

    renderSites();
    updateHint();

    UI.modal({
      title: '关联工地 · ' + (row ? row.name : ''),
      size: '',
      body: body,
      onOk: function () {
        if (onChange) onChange(selSites.slice());
      }
    });
  }

  /* =========================================================
     1. 用户管理（PRD-02 · JDS 用户）
     字段严格：用户名称 / 手机号 / 角色 / 关联项目工地 / 性别
     ========================================================= */
  function users() {
    function openForm(row) {
      var isEdit = !!row;
      var psValue = isEdit ? {
        projectIds: row.projectIds ? row.projectIds.slice() : (row.projectId ? [row.projectId] : []),
        siteIds: row.siteIds ? row.siteIds.slice() : (row.siteId ? [row.siteId] : [])
      } : { projectIds: [], siteIds: [] };

      /* 回显名称：ids -> '名称1、名称2' */
      function namesText(ids, nameFn) {
        return ids.map(function (id) { return nameFn(id); }).join('、');
      }
      function projectBtnText(ids) {
        return ids.length ? ('已关联：' + namesText(ids, S.projectName)) : '点击选择';
      }
      function siteBtnText(ids) {
        return ids.length ? ('已关联：' + namesText(ids, S.siteName)) : '点击选择';
      }

      KIT.formModal({
        title: isEdit ? '编辑用户' : '新增用户',
        docKey: 'jds/users',
        values: isEdit ? {
          name: row.name, phone: row.phone,
          roles: row.roleNames.slice(), gender: row.gender
        } : { gender: '男', roles: [] },
        fields: [
          { key: 'name', label: '用户名称', type: 'input', required: true, maxLength: 10, placeholder: '≤10 字', tip: '用户名称可重名，≤10 字' },
          {
            key: 'phone', label: '手机号', type: 'input', required: true, maxLength: 11,
            placeholder: '请输入 11 位手机号',
            pattern: /^1\d{10}$/, message: '请输入正确的 11 位手机号',
            tip: '手机号全局唯一，且与 JDS 账号互斥'
          },
          { key: 'roles', label: '角色', type: 'multiselect', required: true, options: roleOptions('jds'), placeholder: '请选择角色（可多选）' },
          {
            key: 'projectBtn', label: '关联项目', type: 'button', btnType: 'btn-echo',
            text: projectBtnText(psValue.projectIds),
            onClick: function (btn) { openProjectModal(isEdit ? row : null, function (v) { psValue.projectIds = v; if (btn) btn.textContent = projectBtnText(v); }); }
          },
          {
            key: 'siteBtn', label: '关联工地', type: 'button', btnType: 'btn-echo',
            text: siteBtnText(psValue.siteIds),
            onClick: function (btn) { openSiteModal(isEdit ? row : null, function (v) { psValue.siteIds = v; if (btn) btn.textContent = siteBtnText(v); }); }
          },
          { key: 'gender', label: '性别', type: 'radio', options: [{ value: '男', label: '男' }, { value: '女', label: '女' }] }
        ],
        onSubmit: function (v) {
          /* 手机号唯一校验 */
          if (S.phoneExists(v.phone, isEdit ? row.id : null)) {
            return { phone: '该手机号已存在' };
          }
          var patch = {
            name: v.name, phone: v.phone, roleNames: v.roles, gender: v.gender,
            projectIds: psValue.projectIds, siteIds: psValue.siteIds,
            projectId: psValue.projectIds[0] || '',
            siteId: psValue.siteIds[0] || '',
            projectSite: projectSiteText({ projectIds: psValue.projectIds, siteIds: psValue.siteIds }),
            updateTime: now()
          };
          if (isEdit) {
            S.update('users', row.id, patch);
            UI.toast('编辑成功', 'success');
          } else {
            var id = S.nextId('users', 'U');
            S.add('users', Object.assign({
              id: id, code: id, platform: 'jds', unitName: '', grid: '', idCard: '',
              createTime: now(), userType: 1
            }, patch));
            UI.toast('新增成功', 'success');
          }
          api.reload();
        }
      });
    }

    var api = KIT.listPage({
      title: '用户管理',
      sub: '数字化管理平台 · JDS 用户（内部人员）',
      filters: [
        { key: 'keyword', type: 'input', placeholder: '用户名称 / 手机号', width: 200 },
        { key: 'role', type: 'select', label: '角色', options: roleOptions('jds'), width: 160 }
      ],
      columns: [
        { title: '编号', key: 'code', width: 90 },
        { title: '用户名称', key: 'name', width: 120 },
        { title: '手机号', key: 'phone', width: 130 },
        {
          title: '角色', width: 150,
          render: function (r) { return (r.roleNames && r.roleNames.length) ? r.roleNames.join('、') : '—'; }
        },
        { title: '关联项目/工地', key: 'projectSite', width: 280, render: function (r) { return projectSiteText(r); } },
        { title: '创建时间', key: 'createTime', width: 160 },
        {
          title: '操作', width: 140,
          render: function (r) {
            return KIT.ops([
              { text: '编辑', onClick: function () { openForm(r); } },
              {
                text: '删除', danger: true, onClick: function () {
                  KIT.confirmDelete('用户', function () {
                    S.remove('users', r.id);
                    UI.toast('删除成功', 'success');
                    api.reload();
                  }, { name: r.name });
                }
              }
            ]);
          }
        }
      ],
      load: function (p) {
        return S.usersByPlatform('jds').filter(function (u) {
          if (p.keyword) {
            var kw = String(p.keyword).trim();
            if (u.name.indexOf(kw) < 0 && u.phone.indexOf(kw) < 0) return false;
          }
          if (p.role && u.roleNames.indexOf(p.role) < 0) return false;
          return true;
        });
      },
      addButton: { text: '+ 新增用户', onClick: function () { openForm(null); } }
    });
    api.openForm = openForm;
    return api;
  }

  /* =========================================================
     2. 角色管理（PRD-01 · 内部角色）
     ========================================================= */
  function roles() {
    /* 权限配置弹窗：菜单树（数字化平台 / Web / APP / 大屏），支持全选·半选 */
    function openPerm(role) {
      if (role.builtin) { UI.toast('内置角色不可编辑权限', 'warning'); return; }
      var tr = UI.tree({
        nodes: S.menuTree(), checkable: true,
        checked: role.menuIds || [], allSelected: role.allSelectMenuIds || [],
        expandAll: true
      });
      var box = h('div', {
        style: {
          maxHeight: '360px', overflowY: 'auto',
          border: '1px solid var(--border)', borderRadius: '6px', padding: '8px'
        }
      }, tr);

      UI.modal({
        title: '权限配置 · ' + role.name,
        size: '',
        body: h('div', {}, [
          h('div', { class: 'flex gap-sm mb-md' }, [
            h('button', { class: 'btn btn-text', type: 'button', onclick: function () { tr.checkAll(); } }, '全选'),
            h('button', { class: 'btn btn-text', type: 'button', onclick: function () { tr.uncheckAll(); } }, '清空')
          ]),
          box,
          h('div', { class: 'field-tip mt-md', text: '提示：全选表示包含后续新增菜单（按 PRD-01 规则）。' })
        ]),
        onOk: function () {
          S.update('roles', role.id, { menuIds: tr.getChecked(), updateTime: now() });
          UI.toast('权限已保存', 'success');
          api.reload();
        }
      });
    }

    /* 关联用户弹窗（复选框列表） */
    function openBindUsers(role) {
      var users = S.usersByPlatform(role.platform);
      var opts = users.map(function (u) {
        return { value: u.id, label: u.name, sub: u.phone, meta: (u.roleNames && u.roleNames.length) ? u.roleNames.join('、') : '未分配角色' };
      });
      var cl = UI.transferList({ options: opts, value: role.userIds || [], height: '420px' });
      UI.modal({
        title: '关联用户 · ' + role.name + '（共 ' + users.length + ' 人）',
        size: 'lg',
        body: cl,
        onOk: function () {
          var ids = cl.getValue();
          S.update('roles', role.id, { userIds: ids, userCount: ids.length, updateTime: now() });
          UI.toast('已关联 ' + ids.length + ' 名用户', 'success');
          api.reload();
        }
      });
    }

    function openForm(row) {
      var isEdit = !!row;
      KIT.formModal({
        title: isEdit ? '编辑角色' : '新增角色',
        docKey: 'jds/roles',
        values: isEdit ? { name: row.name, client: S.clientToArray(row.client), remark: row.remark || '' } : { client: ['数字化平台'] },
        fields: [
          { key: 'name', label: '角色名称', type: 'input', required: true, maxLength: 20, placeholder: '≤20 字', tip: '角色名称在平台内唯一' },
          { key: 'client', label: '可用客户端', type: 'multiselect', required: true, options: [{ value: '数字化平台', label: '数字化平台' }, { value: 'Web', label: 'Web' }, { value: 'APP', label: 'APP' }, { value: '大屏', label: '大屏' }] },
          { key: 'menu', label: '菜单权限', type: 'tree', nodes: S.menuTree(), values: isEdit ? { checked: row.menuIds || [], allSelected: row.allSelectMenuIds || [] } : { checked: [], allSelected: [] } },
          { key: 'remark', label: '备注', type: 'textarea', maxLength: 200, placeholder: '≤200 字' }
        ],
        onSubmit: function (v) {
          if (S.nameExists('roles', v.name, isEdit ? row.id : null, function (r) { return r.platform === 'jds'; })) {
            return { name: '角色名称已存在' };
          }
          var patch = { name: v.name, client: v.client, remark: v.remark, menuIds: v.menu.checked, allSelectMenuIds: v.menu.allSelected, updateTime: now() };
          if (isEdit) {
            S.update('roles', row.id, patch); UI.toast('编辑成功', 'success');
          } else {
            S.add('roles', Object.assign({
              id: S.nextId('roles', 'r'), platform: 'jds', builtin: false, type: '内部',
              userCount: 0, canEdit: true, canDelete: true, createTime: now()
            }, patch));
            UI.toast('新增成功', 'success');
          }
          api.reload();
        }
      });
    }

    var api = KIT.listPage({
      title: '角色管理',
      sub: '数字化管理平台 · 内部角色与权限配置（JDS 所有角色均为内部角色）',
      filters: [
        { key: 'keyword', type: 'input', placeholder: '角色名称', width: 200 }
      ],
      columns: [
        {
          title: '角色名称', width: 180,
          render: function (r) {
            return h('div', { class: 'flex items-center gap-sm' }, [
              h('span', { text: r.name }),
              r.builtin ? UI.tag('内置', 'info') : null
            ]);
          }
        },
        { title: '可用客户端', width: 130, render: function (r) { return S.clientText(r.client); } },
        { title: '关联用户', width: 110, render: function (r) { return (r.userCount || 0) + ' 人'; } },
        { title: '更新时间', key: 'updateTime', width: 160 },
        {
          title: '操作', width: 220,
          render: function (r) {
            if (r.builtin) {
              return KIT.ops([
                { text: '关联用户', onClick: function () { openBindUsers(r); } }
              ]);
            }
            return KIT.ops([
              { text: '权限配置', onClick: function () { openPerm(r); } },
              { text: '关联用户', onClick: function () { openBindUsers(r); } },
              { text: '编辑', onClick: function () { openForm(r); } },
              {
                text: '删除', danger: true, onClick: function () {
                  KIT.confirmDelete('角色', function () {
                    S.remove('roles', r.id); UI.toast('删除成功', 'success'); api.reload();
                  }, { name: r.name });
                }
              }
            ]);
          }
        }
      ],
      load: function (p) {
        return S.rolesByPlatform('jds').filter(function (r) {
          if (p.keyword && r.name.indexOf(String(p.keyword).trim()) < 0) return false;
          return true;
        });
      },
      addButton: { text: '+ 新增角色', onClick: function () { openForm(null); } }
    });
    api.openForm = openForm;
    api.openPerm = openPerm;
    api.openBindUsers = openBindUsers;
    return api;
  }

  /* =========================================================
     3. 项目管理（PRD-03）
     ========================================================= */
  function projects() {
    function openForm(row) {
      var isEdit = !!row;
      if (isEdit && row.status === '待审批') { UI.toast('待审批项目不可编辑，请先撤回或等待审批', 'warning'); return; }

      KIT.formModal({
        title: isEdit ? '编辑项目' : '新增项目',
        size: 'lg',
        docKey: 'jds/projects',
        values: isEdit ? {
          code: row.code, name: row.name, siteIds: row.siteIds || [],
          locateFreq: row.locateFreq, menu: row.menuIds || [], copyFrom: row.copyFrom || '', copyRolesFrom: row.copyRolesFrom || '',
          applyOpinion: row.applyOpinion || '', remark: row.remark || ''
        } : { locateFreq: '5分钟', siteIds: [], menu: [], copyRolesFrom: '' },
        fields: [
          { key: 'code', label: '项目编号', type: 'input', tip: '编号由系统生成，不可修改' },
          { key: 'name', label: '项目名称', type: 'input', required: true, maxLength: 20, placeholder: '≤20 字', tip: '项目名称全局唯一' },
          { key: 'siteIds', label: '关联工地', type: 'multiselect', options: siteOptions(), placeholder: '可多选（不选则为无工地项目）' },
          { key: 'locateFreq', label: '获取定位频率', type: 'select', required: true, options: S.enums.locateFreq.map(function (f) { return { value: f, label: f }; }) },
          { key: 'copyFrom', label: '复制菜单', type: 'select', options: [{ value: '', label: '不复制' }].concat(projectOptions()), tip: '复制已有项目的菜单权限配置' },
          { key: 'menu', label: '菜单权限', type: 'tree', nodes: S.menuTree() },
          { key: 'copyRolesFrom', label: '复制角色', type: 'select', options: [{ value: '', label: '不复制' }].concat(projectOptions().filter(function (p) { return !isEdit || p.value !== row.id; })), tip: '复制源项目的默认和自定义角色及权限；不复制管理员和关联用户；同名角色覆盖配置但保留目标用户关联' },
          { key: 'applyOpinion', label: '申请意见', type: 'textarea', required: true, maxLength: 200, placeholder: '请输入申请意见（≤200 字）' },
          { key: 'remark', label: '备注', type: 'textarea', maxLength: 200, placeholder: '≤200 字' }
        ],
        onSubmit: function (v) {
          if (S.nameExists('projects', v.name, isEdit ? row.id : null)) return { name: '项目名称已存在' };
          if (!v.applyOpinion.trim()) return { applyOpinion: '请填写申请意见' };

          /* 复制菜单 */
          var menuIds = v.menu;
          if (v.copyFrom) {
            var src = S.find('projects', v.copyFrom);
            if (src) menuIds = (src.menuIds || []).slice();
          }

          var patch = {
            name: v.name, siteIds: v.siteIds, locateFreq: v.locateFreq,
            menuIds: menuIds, copyFrom: v.copyFrom,
            applyOpinion: v.applyOpinion, remark: v.remark
          };

          if (isEdit) {
            S.update('projects', row.id, patch);
            var copiedEditRoles = v.copyRolesFrom ? copyCustomRoles('project', v.copyRolesFrom, 'project', row.id) : 0;
            UI.toast('编辑成功' + (copiedEditRoles ? '，已复制 ' + copiedEditRoles + ' 个角色' : ''), 'success');
          } else {
            var id = S.nextId('projects', 'p');
            S.add('projects', Object.assign({
              id: id,
              code: 'XM' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '00' + (S.list('projects').length + 1),
              status: '待审批', creator: '王宇', createTime: now(),
              approveRecords: [{ time: now(), action: '提交申请', user: '王宇' }]
            }, patch));
            var copiedRoles = v.copyRolesFrom ? copyCustomRoles('project', v.copyRolesFrom, 'project', id) : 0;
            UI.toast('新增成功，已提交审批' + (copiedRoles ? '，已复制 ' + copiedRoles + ' 个自定义角色' : ''), 'success');
          }
          api.reload();
        }
      });
    }

    /* 详情 */
    function openDetail(row) {
      var sites = (row.siteIds || []).map(function (id) { return S.siteName(id); }).join('、') || '—';
      KIT.detailModal({
        title: '项目详情 · ' + row.name,
        size: 'lg',
        items: [
          { k: '项目编号', v: row.code },
          { k: '项目名称', v: row.name },
          { k: '审批状态', v: UI.statusTag(row.status) },
          { k: '关联工地', v: sites },
          { k: '定位频率', v: row.locateFreq },
          { k: '创建时间', v: row.createTime },
          { k: '申请人', v: row.creator },
          { k: '更新时间', v: row.updateTime || '—' },
          { k: '备注', v: row.remark || '—', full: true },
          { k: '申请意见', v: row.applyOpinion || '—', full: true }
        ],
        extra: menuDetailNode(row.menuIds || []),
        records: row.approveRecords || []
      });
    }

    /* 审批 */
    function openApprove(row) {
      if (row.status !== '待审批') { UI.toast('仅待审批项目可审批', 'warning'); return; }
      KIT.approveModal({
        title: '项目审批 · ' + row.name,
        onSubmit: function (res) {
          var rec = {
            time: now(),
            action: res.result === '通过' ? '审批通过' : '驳回',
            user: '李审查',
            opinion: res.opinion
          };
          S.update('projects', row.id, {
            status: res.result === '通过' ? '通过' : '已驳回',
            approveRecords: (row.approveRecords || []).concat([rec])
          });
          UI.toast(res.result === '通过' ? '已通过（并自动生成项目管理员角色）' : '已驳回', 'success');
          api.reload();
        }
      });
    }

    var api = KIT.listPage({
      title: '项目管理',
      sub: '数字化管理平台 · 工程项目（含审批流）',
      filters: [
        { key: 'keyword', type: 'input', placeholder: '项目编号 / 名称', width: 200 },
        { key: 'status', type: 'select', label: '审批状态', options: S.enums.approveStatus.map(function (s) { return { value: s, label: s }; }), width: 150 }
      ],
      columns: [
        { title: '项目编号', key: 'code', width: 150 },
        {
          title: '项目名称', width: 200,
          render: function (r) { return h('a', { href: 'javascript:void(0)', onclick: function () { openDetail(r); }, text: r.name }); }
        },
        { title: '关联工地数', width: 110, render: function (r) { return ((r.siteIds || []).length) + ' 个'; } },
        { title: '审批状态', width: 110, render: function (r) { return UI.statusTag(r.status); } },
        { title: '创建时间', key: 'createTime', width: 160 },
        { title: '创建人', width: 100, render: function (r) { return r.creator || '—'; } },
        {
          title: '操作', width: 220,
          render: function (r) {
            var links = [
              { text: '详情', onClick: function () { openDetail(r); } },
              { text: '编辑', onClick: function () { openForm(r); } }
            ];
            if (r.status === '待审批') links.push({ text: '审批', onClick: function () { openApprove(r); } });
            links.push({
              text: '删除', danger: true, onClick: function () {
                if (r.status === '待审批') { UI.toast('待审批项目不可删除', 'warning'); return; }
                if ((r.siteIds || []).length) { UI.toast('存在关联工地，请先解绑工地', 'warning'); return; }
                KIT.confirmDelete('项目', function () {
                  S.remove('projects', r.id); UI.toast('删除成功', 'success'); api.reload();
                }, { name: r.name });
              }
            });
            return KIT.ops(links);
          }
        }
      ],
      load: function (p) {
        return S.list('projects').filter(function (r) {
          if (p.keyword) {
            var kw = String(p.keyword).trim();
            if (r.name.indexOf(kw) < 0 && r.code.indexOf(kw) < 0) return false;
          }
          if (p.status && r.status !== p.status) return false;
          return true;
        });
      },
      addButton: { text: '+ 新增项目', onClick: function () { openForm(null); } }
    });
    api.openForm = openForm;
    api.openDetail = openDetail;
    api.openApprove = openApprove;
    return api;
  }

  /* =========================================================
     4. 工地管理（PRD-03）
     ========================================================= */
  function sites() {
    function canApproveSite() {
      var user = DG.app.state.user || {};
      if (user.userType !== 1) return false;
      var roleNames = user.roleNames || [];
      return S.rolesByPlatform('jds').some(function (role) {
        if (roleNames.indexOf(role.name) < 0) return false;
        var menuIds = role.menuIds || [];
        var allSelected = role.allSelectMenuIds || [];
        return menuIds.indexOf('m-site-approve') >= 0 || allSelected.indexOf('m-site') >= 0;
      });
    }

    function openForm(row) {
      var isEdit = !!row;
      if (isEdit && row.approveStatus === '待审批') { UI.toast('待审批工地不可编辑', 'warning'); return; }

      KIT.formModal({
        title: isEdit ? '编辑工地' : '新增工地',
        size: 'lg',
        docKey: 'jds/sites',
        values: isEdit ? {
          code: row.code, name: row.name, similarName: row.similarName,
          projectId: row.projectId, siteStatus: row.siteStatus, trialEnd: row.trialEnd,
          locateFreq: row.locateFreq, lng: row.lng, lat: row.lat,
          menu: row.menuIds || [], copyFrom: row.copyFrom || '', copyRolesFrom: row.copyRolesFrom || '',
          applyOpinion: row.applyOpinion || '', remark: row.remark || ''
        } : { siteStatus: '正式', locateFreq: '5分钟', menu: [], copyRolesFrom: '' },
        fields: [
          { key: 'code', label: '工地编号', type: 'input', tip: '编号由系统生成，不可修改' },
          { key: 'name', label: '工地名称', type: 'input', required: true, maxLength: 10, placeholder: '≤10 字', tip: '工地名称全局唯一' },
          { key: 'similarName', label: '相似名', type: 'input', maxLength: 10, placeholder: '用于工地内模糊识别（如 TJ1）' },
          { key: 'projectId', label: '所属项目', type: 'select', options: [{ value: '', label: '不归属项目（独立工地）' }].concat(projectOptions()) },
          { key: 'siteStatus', label: '工地状态', type: 'select', required: true, options: S.enums.siteStatus.map(function (s) { return { value: s, label: s }; }) },
          {
            key: 'trialEnd', label: '试用期限', type: 'date', required: true,
            showIf: { key: 'siteStatus', test: function (v) { return v === '试用'; } },
            tip: '选择“试用”时必填'
          },
          { key: 'locateFreq', label: '获取定位频率', type: 'select', required: true, options: S.enums.locateFreq.map(function (f) { return { value: f, label: f }; }) },
          { key: 'lng', label: '经度', type: 'input', placeholder: '如 103.4521' },
          { key: 'lat', label: '纬度', type: 'input', placeholder: '如 30.4128' },
          { key: 'copyFrom', label: '复制菜单', type: 'select', options: [{ value: '', label: '不复制' }].concat(siteOptions()), tip: '复制已有工地的菜单权限配置' },
          { key: 'menu', label: '菜单权限', type: 'tree', nodes: S.menuTree() },
          { key: 'copyRolesFrom', label: '复制角色', type: 'select', options: [{ value: '', label: '不复制' }].concat(siteOptions().filter(function (s) { return !isEdit || s.value !== row.id; })), tip: '复制源工地的默认和自定义角色及权限；不复制管理员和关联用户；同名角色覆盖配置但保留目标用户关联' },
          { key: 'applyOpinion', label: '申请意见', type: 'textarea', required: true, maxLength: 200, placeholder: '请输入申请意见（≤200 字）' },
          { key: 'remark', label: '备注', type: 'textarea', maxLength: 200, placeholder: '≤200 字' }
        ],
        onSubmit: function (v) {
          if (S.nameExists('sites', v.name, isEdit ? row.id : null)) return { name: '工地名称已存在' };
          if (v.siteStatus === '试用' && !v.trialEnd) return { trialEnd: '请选择试用期限' };

          var menuIds = v.menu;
          if (v.copyFrom) {
            var src = S.find('sites', v.copyFrom);
            if (src) menuIds = (src.menuIds || []).slice();
          }

          var patch = {
            name: v.name, similarName: v.similarName, projectId: v.projectId,
            projectName: v.projectId ? S.projectName(v.projectId) : '独立工地',
            siteStatus: v.siteStatus, trialEnd: v.siteStatus === '试用' ? v.trialEnd : '',
            locateFreq: v.locateFreq, lng: v.lng, lat: v.lat,
            menuIds: menuIds, copyFrom: v.copyFrom,
            applyOpinion: v.applyOpinion, remark: v.remark
          };

          if (isEdit) {
            S.update('sites', row.id, patch);
            var copiedEditSiteRoles = v.copyRolesFrom ? copyCustomRoles('site', v.copyRolesFrom, 'site', row.id) : 0;
            UI.toast('编辑成功' + (copiedEditSiteRoles ? '，已复制 ' + copiedEditSiteRoles + ' 个角色' : ''), 'success');
          } else {
            var id = S.nextId('sites', 's');
            S.add('sites', Object.assign({
              id: id,
              code: 'GD' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '00' + (S.list('sites').length + 1),
              approveStatus: '待审批', creator: '王宇', createTime: now(),
              approveRecords: [{ time: now(), action: '提交申请', user: '王宇' }]
            }, patch));
            var copiedSiteRoles = v.copyRolesFrom ? copyCustomRoles('site', v.copyRolesFrom, 'site', id) : 0;
            UI.toast('新增成功，已提交审批' + (copiedSiteRoles ? '，已复制 ' + copiedSiteRoles + ' 个自定义角色' : ''), 'success');
          }
          api.reload();
        }
      });
    }

    /* 详情：工地信息 + 审批信息 */
    function openDetail(row) {
      KIT.detailModal({
        title: '工地详情 · ' + row.name,
        size: 'lg',
        items: [
          { k: '工地编号', v: row.code },
          { k: '工地名称', v: row.name },
          { k: '相似名', v: row.similarName || '—' },
          { k: '所属项目', v: row.projectId ? S.projectName(row.projectId) : '独立工地' },
          { k: '审批状态', v: UI.statusTag(row.approveStatus) },
          { k: '工地状态', v: UI.statusTag(row.siteStatus) },
          { k: '试用期限', v: row.trialEnd || '—' },
          { k: '定位频率', v: row.locateFreq || '—' },
          { k: '经度', v: row.lng || '—' },
          { k: '纬度', v: row.lat || '—' },
          { k: '创建人', v: row.creator || '—' },
          { k: '创建时间', v: row.createTime || '—' },
          { k: '更新时间', v: row.updateTime || '—' },
          { k: '备注', v: row.remark || '—', full: true },
          { k: '申请意见', v: row.applyOpinion || '—', full: true }
        ],
        extra: menuDetailNode(row.menuIds || []),
        records: row.approveRecords || []
      });
    }

    function openApprove(row) {
      if (!canApproveSite()) { UI.toast('当前账号无工地审批权限', 'error'); return; }
      if (row.approveStatus !== '待审批') { UI.toast('仅待审批工地可审批', 'warning'); return; }
      KIT.approveModal({
        title: '工地审批 · ' + row.name,
        onSubmit: function (res) {
          S.update('sites', row.id, {
            approveStatus: res.result === '通过' ? '通过' : '已驳回',
            approveRecords: (row.approveRecords || []).concat([{
              time: now(), action: res.result === '通过' ? '审批通过' : '驳回',
              user: '李审查', opinion: res.opinion
            }])
          });
          UI.toast(res.result === '通过' ? '已通过（并自动生成工地管理员角色）' : '已驳回', 'success');
          api.reload();
        }
      });
    }

    var api = KIT.listPage({
      title: '工地管理',
      sub: '数字化管理平台 · 工地（含审批流）',
      filters: [
        { key: 'keyword', type: 'input', placeholder: '工地编号 / 名称 / 相似名', width: 220 },
        { key: 'projectId', type: 'select', label: '所属项目', options: projectOptions(), width: 180 },
        { key: 'approveStatus', type: 'select', label: '审批状态', options: S.enums.approveStatus.map(function (s) { return { value: s, label: s }; }), width: 140 },
        { key: 'siteStatus', type: 'select', label: '工地状态', options: S.enums.siteStatus.map(function (s) { return { value: s, label: s }; }), width: 130 }
      ],
      columns: [
        { title: '工地编号', key: 'code', width: 150 },
        { title: '工地名称', key: 'name', width: 160 },
        { title: '相似名', key: 'similarName', width: 100 },
        { title: '所属项目', width: 180, render: function (r) { return r.projectId ? S.projectName(r.projectId) : '独立工地'; } },
        { title: '审批状态', width: 110, render: function (r) { return UI.statusTag(r.approveStatus); } },
        {
          title: '工地状态', width: 140,
          render: function (r) {
            return h('div', { class: 'flex items-center gap-sm' }, [
              UI.statusTag(r.siteStatus),
              r.siteStatus === '试用' && r.trialEnd ? h('span', { class: 'text-xs muted', text: '至 ' + r.trialEnd }) : null
            ]);
          }
        },
        { title: '创建时间', key: 'createTime', width: 160 },
        { title: '创建人', width: 100, render: function (r) { return r.creator || '—'; } },
        {
          title: '操作', width: 240,
          render: function (r) {
            var links = [
              { text: '详情', onClick: function () { openDetail(r); } },
              { text: '编辑', onClick: function () { openForm(r); } }
            ];
            if (r.approveStatus === '待审批' && canApproveSite()) links.push({ text: '审批', onClick: function () { openApprove(r); } });
            links.push({
              text: '删除', danger: true, onClick: function () {
                if (r.approveStatus === '待审批') { UI.toast('待审批工地不可删除', 'warning'); return; }
                KIT.confirmDelete('工地', function () {
                  S.remove('sites', r.id); UI.toast('删除成功', 'success'); api.reload();
                }, { name: r.name });
              }
            });
            return KIT.ops(links);
          }
        }
      ],
      load: function (p) {
        return S.list('sites').filter(function (r) {
          if (p.keyword) {
            var kw = String(p.keyword).trim();
            if (r.name.indexOf(kw) < 0 && r.code.indexOf(kw) < 0 && (r.similarName || '').indexOf(kw) < 0) return false;
          }
          if (p.projectId && r.projectId !== p.projectId) return false;
          if (p.approveStatus && r.approveStatus !== p.approveStatus) return false;
          if (p.siteStatus && r.siteStatus !== p.siteStatus) return false;
          return true;
        });
      },
      addButton: { text: '+ 新增工地', onClick: function () { openForm(null); } }
    });
    api.openForm = openForm;
    api.openApprove = openApprove;
    return api;
  }

  /* ---------------- 工具 ---------------- */
  function now() {
    var d = new Date(), p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  return {
    users: users,
    roles: roles,
    projects: projects,
    sites: sites
  };
})();
