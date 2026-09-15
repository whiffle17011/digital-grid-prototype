/* ===========================================================
   数字网格 Web · 工地端
   用户管理（所属工地=当前工地）/ 角色管理（含角色别名列）/ 用户设置
   侧栏为浅色（白底 + 主色高亮）
   =========================================================== */
window.DG = window.DG || {};
DG.views = DG.views || {};

DG.views.site = (function () {
  var UI = DG.ui, KIT = DG.kit, S = DG.store;
  var h = UI.h;

  function now() {
    var d = new Date(), p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function ctxSiteId() { return DG.app.state.siteId || 's1'; }
  function ctxSite() { return S.find('sites', ctxSiteId()); }

  function roleOptions() {
    return S.rolesByPlatform('site').map(function (r) { return { value: r.name, label: r.name }; });
  }

  /* =========================================================
     1. 用户管理（PRD-02 · 工地端用户，所属工地=当前工地）
     ========================================================= */
  function users() {
    function openForm(row) {
      var isEdit = !!row;
      var site = ctxSite();
      KIT.formModal({
        title: isEdit ? '编辑用户' : '新增用户',
        docKey: 'site/users',
        values: isEdit ? {
          name: row.name, alias: row.alias, phone: row.phone,
          roles: row.roleNames.slice(), gender: row.gender, idCard: row.idCard, grid: row.grid
        } : { gender: '男', roles: [] },
        fields: [
          { key: 'name', label: '用户名称', type: 'input', required: true, maxLength: 10, placeholder: '≤10 字' },
          { key: 'alias', label: '别名', type: 'input', maxLength: 10, placeholder: '选填，列表中有别名时优先显示' },
          { key: 'phone', label: '手机号', type: 'input', required: true, maxLength: 11, placeholder: '11 位手机号', pattern: /^1\d{10}$/, message: '请输入正确的手机号' },
          { key: 'roles', label: '关联角色', type: 'multiselect', required: true, options: roleOptions(), placeholder: '可多选' },
          { key: 'gender', label: '性别', type: 'radio', options: [{ value: '男', label: '男' }, { value: '女', label: '女' }] }
        ],
        onSubmit: function (v) {
          if (S.phoneExists(v.phone, isEdit ? row.id : null)) return { phone: '该手机号已存在' };
          var siteName = site ? site.name : S.siteName(ctxSiteId());
          var patch = {
            name: v.name, alias: v.alias, phone: v.phone, roleNames: v.roles,
            gender: v.gender, idCard: isEdit ? row.idCard : '', grid: isEdit ? row.grid : '',
            unitName: siteName, siteId: ctxSiteId(),
            projectSite: siteName
          };
          if (site) patch.projectId = site.projectId;

          if (isEdit) {
            S.update('users', row.id, patch); UI.toast('编辑成功', 'success');
          } else {
            var id = S.nextId('users', 'U');
            S.add('users', Object.assign({
              id: id, code: id, platform: 'site', createTime: now(), userType: 3
            }, patch));
            UI.toast('新增成功', 'success');
          }
          api.reload();
        }
      });
    }

    var api = KIT.listPage({
      title: '用户管理',
      sub: '工地端用户 · 所属工地 = ' + S.siteName(ctxSiteId()),
      filters: [
        { key: 'keyword', type: 'input', placeholder: '名称 / 别名 / 手机号', width: 200 },
        { key: 'role', type: 'select', label: '角色', options: roleOptions(), width: 160 }
      ],
      columns: [
        { title: '编号', key: 'code', width: 90 },
        {
          title: '用户名称', width: 140,
          render: function (r) {
            return h('div', { class: 'flex items-center gap-sm' }, [
              h('span', { text: r.alias || r.name }),
              r.alias ? h('span', { class: 'text-xs muted', text: '（' + r.name + '）' }) : null
            ]);
          }
        },
        { title: '手机号', key: 'phone', width: 130 },
        { title: '所属工地', key: 'unitName', width: 180 },
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
                  }, { name: r.name, tip: '网格内用户或有待办的用户禁止删除。' });
                }
              }
            ]);
          }
        }
      ],
      load: function (p) {
        return S.usersByPlatform('site').filter(function (u) {
          if (u.siteId && u.siteId !== ctxSiteId()) return false;
          if (p.keyword) {
            var kw = String(p.keyword).trim();
            if (u.name.indexOf(kw) < 0 && (u.alias || '').indexOf(kw) < 0 && u.phone.indexOf(kw) < 0) return false;
          }
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
     2. 角色管理（PRD-01 · 工地端）
     含角色别名列；管理员(内置) + 项目同步默认角色 + 工地自定义角色
     ========================================================= */
  function roles() {
    function openPerm(role) {
      if (role.builtin) { UI.toast('内置角色不可编辑权限', 'warning'); return; }
      if (role.source === '项目同步') { UI.toast('项目同步角色请在项目端修改权限', 'warning'); return; }
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
          S.update('roles', role.id, { menuIds: tr.getChecked(), allSelectMenuIds: tr.getAllSelected(), updateTime: now() });
          UI.toast('权限已保存', 'success'); api.reload();
        }
      });
    }

    function openBindUsers(role) {
      var users = S.usersByPlatform('site').filter(function (u) { return u.siteId === ctxSiteId(); });
      if (!users.length) { UI.toast('当前工地暂无用户', 'warning'); return; }
      var opts = users.map(function (u) {
        return { value: u.id, label: (u.alias || u.name), sub: u.phone, meta: (u.roleNames && u.roleNames.length) ? u.roleNames.join('、') : '未分配角色' };
      });
      var cl = UI.transferList({ options: opts, value: role.userIds || [], height: '420px' });
      UI.modal({
        title: '关联用户 · ' + role.name + '（当前工地共 ' + users.length + ' 人）',
        size: 'lg',
        body: cl,
        onOk: function () {
          var ids = cl.getValue();
          S.update('roles', role.id, { userIds: ids, userCount: ids.length, updateTime: now() });
          UI.toast('已关联 ' + ids.length + ' 名用户', 'success'); api.reload();
        }
      });
    }

    function openForm(row) {
      var isEdit = !!row;
      KIT.formModal({
        title: isEdit ? '编辑角色' : '新增角色',
        docKey: 'site/roles',
        values: isEdit ? {
          name: row.name, alias: row.alias || '', client: S.clientToArray(row.client), remark: row.remark || '',
          menu: { checked: row.menuIds || [], allSelected: row.allSelectMenuIds || [] }
        } : { client: ['Web', 'APP'], menu: { checked: [], allSelected: [] } },
        fields: [
          { key: 'name', label: '角色名称', type: 'input', required: true, maxLength: 20, tip: '角色名称在工地内唯一' },
          { key: 'alias', label: '角色别名', type: 'input', maxLength: 20, placeholder: '工地上习惯的叫法（选填）' },
          { key: 'client', label: '可用客户端', type: 'multiselect', required: true, options: [{ value: 'Web', label: 'Web' }, { value: 'APP', label: 'APP' }] },
          { key: 'menu', label: '菜单权限', type: 'tree', nodes: S.menuTree() },
          { key: 'remark', label: '备注', type: 'textarea', maxLength: 200 }
        ],
        onSubmit: function (v) {
          if (S.nameExists('roles', v.name, isEdit ? row.id : null, function (r) { return r.platform === 'site'; })) {
            return { name: '角色名称已存在' };
          }
          var patch = { name: v.name, alias: v.alias, client: v.client, remark: v.remark, menuIds: v.menu.checked, allSelectMenuIds: v.menu.allSelected, updateTime: now() };
          if (isEdit) {
            S.update('roles', row.id, patch); UI.toast('编辑成功', 'success');
          } else {
            S.add('roles', Object.assign({
              id: S.nextId('roles', 'r'), platform: 'site', type: '自定义', builtin: false,
              userCount: 0, source: '工地自定义', canEdit: true, canDelete: true, createTime: now()
            }, patch));
            UI.toast('新增成功', 'success');
          }
          api.reload();
        }
      });
    }

    var api = KIT.listPage({
      title: '角色管理',
      sub: '工地端 · 管理员（内置）+ 项目同步默认角色 + 工地自定义角色',
      filters: [
        { key: 'keyword', type: 'input', placeholder: '角色名称 / 别名', width: 200 },
        { key: 'source', type: 'select', label: '来源', options: [{ value: '内置', label: '内置' }, { value: '项目同步', label: '项目同步' }, { value: '工地自定义', label: '工地自定义' }], width: 150 }
      ],
      columns: [
        {
          title: '角色名称', width: 160,
          render: function (r) {
            return h('div', { class: 'flex items-center gap-sm' }, [
              h('span', { text: r.name }),
              r.builtin ? UI.tag('内置', 'info') : null
            ]);
          }
        },
        { title: '角色别名', width: 130, render: function (r) { return r.alias || '—'; } },
        { title: '角色类型', width: 110, render: function (r) { return UI.tag(r.type || '—', r.type === '管理员' ? 'primary' : (r.type === '默认' ? 'info' : 'default')); } },
        {
          title: '来源', width: 120,
          render: function (r) { return UI.tag(r.source || '工地自定义', r.source === '项目同步' ? 'primary' : 'default'); }
        },
        { title: '可用客户端', width: 110, render: function (r) { return S.clientText(r.client); } },
        { title: '关联用户', width: 100, render: function (r) { return (r.userCount || 0) + ' 人'; } },
        { title: '更新时间', key: 'updateTime', width: 150 },
        {
          title: '操作', width: 240,
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
            if (r.source !== '项目同步') {
              links.push({ text: '编辑', onClick: function () { openForm(r); } });
            }
            if (!r.builtin) {
              links.push({
                text: '删除', danger: true, onClick: function () {
                  KIT.confirmDelete('角色', function () {
                    S.remove('roles', r.id); UI.toast('删除成功', 'success'); api.reload();
                  }, { name: r.name });
                }
              });
            }
            return KIT.ops(links);
          }
        }
      ],
      load: function (p) {
        return S.sortRoles(S.rolesByPlatform('site').filter(function (r) {
          if (p.keyword) {
            var kw = String(p.keyword).trim();
            if (r.name.indexOf(kw) < 0 && (r.alias || '').indexOf(kw) < 0) return false;
          }
          if (p.source && (r.source || '工地自定义') !== p.source) return false;
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
     3. 用户设置（切换端）
     ========================================================= */
  function settings() {
    var root = h('div', {});
    function render() {
      UI.clear(root);
      var user = DG.app.state.user || {};
      var site = ctxSite();
      root.appendChild(h('div', { class: 'page-head' }, [
        h('div', {}, [
          h('div', { class: 'page-title', text: '用户设置' }),
          h('div', { class: 'page-sub', text: user.userType === 1 ? '切换端别、工地与账号信息' : '账号信息' })
        ])
      ]));
      root.appendChild(h('div', { class: 'card', style: { maxWidth: '640px' } }, [
        h('div', { class: 'desc-list' }, [
          h('div', { class: 'desc-item' }, [h('span', { class: 'k', text: '用户名称' }), h('span', { class: 'v', text: (user.alias || user.name || '—') })]),
          h('div', { class: 'desc-item' }, [h('span', { class: 'k', text: '手机号' }), h('span', { class: 'v', text: user.phone || '—' })]),
          h('div', { class: 'desc-item' }, [h('span', { class: 'k', text: '当前端别' }), h('span', { class: 'v' }, UI.tag('工地端', 'primary'))]),
          h('div', { class: 'desc-item' }, [h('span', { class: 'k', text: '当前工地' }), h('span', { class: 'v', text: site ? site.name : S.siteName(ctxSiteId()) })]),
          h('div', { class: 'desc-item' }, [h('span', { class: 'k', text: '所属项目' }), h('span', { class: 'v', text: site ? S.projectName(site.projectId) : '独立工地' })]),
          h('div', { class: 'desc-item' }, [h('span', { class: 'k', text: '所属网格' }), h('span', { class: 'v', text: user.grid || '—' })])
        ]),
        h('div', { class: 'mt-xl flex gap-md' }, [
          user.userType === 1 ? h('button', {
            class: 'btn btn-primary', type: 'button',
            onclick: function () { DG.app.switchPlatform('project'); }
          }, '切换到项目端') : null,
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

  return { users: users, roles: roles, settings: settings };
})();
