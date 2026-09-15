/* ===========================================================
   主程序：状态 / 路由 / 三端框架（侧栏·顶栏·内容区）
   =========================================================== */
window.DG = window.DG || {};

DG.app = (function () {
  var UI = DG.ui, S = DG.store, KIT = DG.kit;
  var h = UI.h;

  var appEl = document.getElementById('app');

  var state = {
    user: null,
    platform: null,     /* jds | project | site */
    projectId: '',
    siteId: ''
  };

  /* 构建标记：jds | web | all（由 index / jds / web 三个入口文件指定） */
  var BUILD = String(window.DG_BUILD || 'all').toLowerCase();

  /* ---------------- 菜单配置 ---------------- */
  var MENUS = {
    jds: {
      name: '数字化管理平台',
      theme: 'dark',
      items: [
        { key: 'users', label: '用户管理', icon: '👤' },
        { key: 'roles', label: '角色管理', icon: '⚙' },
        { key: 'projects', label: '项目管理', icon: '▤' },
        { key: 'sites', label: '工地管理', icon: '⬢' }
      ]
    },
    project: {
      name: '数字网格 Web · 项目端',
      theme: 'light',
      items: [
        { key: 'users', label: '用户管理', icon: '👤' },
        { key: 'roles', label: '角色管理', icon: '⚙' },
        { key: 'units', label: '单位管理', icon: '🏢' },
        { key: 'settings', label: '用户设置', icon: '⚑' }
      ]
    },
    site: {
      name: '数字网格 Web · 工地端',
      theme: 'light',
      items: [
        { key: 'users', label: '用户管理', icon: '👤' },
        { key: 'roles', label: '角色管理', icon: '⚙' },
        { key: 'settings', label: '用户设置', icon: '⚑' }
      ]
    }
  };

  var DEFAULT_ROUTE = { jds: '#/jds/users', project: '#/project/users', site: '#/site/users' };

  /* 按 BUILD 裁剪菜单 */
  function pruneMenus() {
    if (BUILD === 'jds') { delete MENUS.project; delete MENUS.site; }
    if (BUILD === 'web') { delete MENUS.jds; }
  }
  pruneMenus();

  /* ---------------- 路由解析 ---------------- */
  function parse() {
    var hash = location.hash || '#/login';
    var parts = hash.replace(/^#\//, '').split('/');
    return { p0: parts[0] || '', p1: parts[1] || '' };
  }

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  /* ---------------- 登录 / 切换端 / 退出 ---------------- */
  function enter(user, platform, ctx) {
    state.user = user;
    state.platform = platform;
    state.projectId = (ctx && ctx.projectId) || '';
    state.siteId = (ctx && ctx.siteId) || '';
    /* 进入端别时补齐上下文默认值 */
    if (platform === 'project' && !state.projectId) {
      var p = S.list('projects')[0];
      state.projectId = p ? p.id : '';
    }
    if (platform === 'site' && !state.siteId) {
      var s = S.list('sites')[0];
      state.siteId = s ? s.id : '';
      if (s) state.projectId = s.projectId;
    }
    UI.toast('欢迎，' + (user.alias || user.name), 'success');
    go(DEFAULT_ROUTE[platform] || '#/login');
  }

  function switchPlatform(platform) {
    if (!state.user) return;
    if (platform === 'project' && state.user.userType === 3) {
      UI.toast('该账号为工地用户，无项目端权限', 'warning');
      return;
    }
    if (platform === 'site' && state.user.userType === 2) {
      UI.toast('该账号为项目用户，无工地端权限', 'warning');
      return;
    }
    var ctx = {};
    if (platform === 'project') {
      if (state.projectId) ctx.projectId = state.projectId;
    } else if (platform === 'site') {
      var site = S.find('sites', state.siteId);
      /* 当前项目已切换时，优先进入该项目下工地 */
      if (!site || (state.projectId && site.projectId !== state.projectId)) {
        site = S.list('sites').filter(function (x) { return x.projectId === state.projectId; })[0]
          || S.list('sites')[0];
      }
      if (site) {
        ctx.siteId = site.id;
        ctx.projectId = site.projectId;
      }
    }
    enter(state.user, platform, ctx);
  }

  function logout() {
    state.user = null;
    state.platform = null;
    go('#/login');
  }

  /* ---------------- 侧栏 ---------------- */
  function renderSider(cfg, activeKey) {
    var body = h('div', { class: 'sider-body' });
    cfg.items.forEach(function (it) {
      body.appendChild(h('div', {
        class: 'menu-item' + (it.key === activeKey ? ' is-active' : ''),
        onclick: function () { go('#/' + state.platform + '/' + it.key); }
      }, [
        h('span', { class: 'mi-icon', text: it.icon }),
        h('span', { class: 'mi-label', text: it.label })
      ]));
    });

    return h('div', { class: 'sider sider-' + cfg.theme }, [
      h('div', { class: 'sider-logo' }, [
        h('span', { class: 'brand-mark-sm', text: '网' })
      ]),
      h('div', { class: 'sider-menu-title', text: cfg.name }),
      body
    ]);
  }

  /* ---------------- 顶栏 ---------------- */
  function contextStatic(kind) {
    var isProject = kind === 'project';
    return h('div', { class: 'ctx-switch is-static' }, [
      h('span', { class: 'text-xs muted', text: isProject ? '当前项目' : '当前工地' }),
      h('span', { text: isProject ? S.projectName(state.projectId) : S.siteName(state.siteId) })
    ]);
  }

  function contextSelect(kind) {
    var isProject = kind === 'project';
    var value = isProject ? state.projectId : state.siteId;
    var options = isProject
      ? S.list('projects').map(function (p) { return { value: p.id, label: p.name }; })
      : S.list('sites').map(function (s) { return { value: s.id, label: s.name }; });
    var select = h('select', {
      class: 'ctx-select',
      'aria-label': isProject ? '切换当前项目' : '切换当前工地'
    }, options.map(function (o) {
      return h('option', { value: o.value, selected: String(o.value) === String(value) }, o.label);
    }));
    select.addEventListener('change', function () {
      if (isProject) {
        state.projectId = select.value;
        UI.toast('已切换项目：' + S.projectName(select.value), 'success');
      } else {
        state.siteId = select.value;
        var site = S.find('sites', state.siteId);
        if (site) state.projectId = site.projectId;
        UI.toast('已切换工地：' + S.siteName(select.value), 'success');
      }
      render();
    });
    return h('div', { class: 'ctx-switch is-selectable' }, [
      h('span', { class: 'text-xs muted', text: isProject ? '当前项目' : '当前工地' }),
      select,
      h('span', { class: 'caret', text: '▼' })
    ]);
  }

  function renderHeader(cfg, activeKey) {
    var activeItem = cfg.items.filter(function (i) { return i.key === activeKey; })[0];
    var title = activeItem ? activeItem.label : '';

    var left = h('div', { class: 'header-left' }, [
      UI.crumb(['首页', title])
    ]);

    /* 仅 JDS 用户可切换当前项目 / 工地；普通项目/工地用户仅展示当前上下文 */
    var isJdsUser = state.user && state.user.userType === 1;
    if (state.platform === 'project') {
      left.appendChild(isJdsUser ? contextSelect('project') : contextStatic('project'));
    } else if (state.platform === 'site') {
      left.appendChild(isJdsUser ? contextSelect('site') : contextStatic('site'));
    }

    /* 用户菜单 */
    var user = state.user || {};
    var menu = h('div', { class: 'user-menu hidden' }, [
      (state.platform === 'project' || state.platform === 'site')
        ? h('div', { class: 'user-menu-item', onclick: function () { go('#/' + state.platform + '/settings'); } }, '⚑  用户设置')
        : null,
      isJdsUser && state.platform === 'project'
        ? h('div', { class: 'user-menu-item', onclick: function () { switchPlatform('site'); } }, '⇄  切换到工地端')
        : (isJdsUser && state.platform === 'site'
          ? h('div', { class: 'user-menu-item', onclick: function () { switchPlatform('project'); } }, '⇄  切换到项目端')
          : null),
      h('div', { class: 'user-menu-sep' }),
      h('div', {
        class: 'user-menu-item',
        onclick: function () {
          UI.confirm({
            title: '重置演示数据',
            content: '将恢复到初始 Mock 数据，确认继续？',
            okText: '确认重置',
            onOk: function () { S.reset(); UI.toast('已重置为初始数据', 'success'); render(); }
          });
        }
      }, '⟲  重置演示数据'),
      h('div', { class: 'user-menu-sep' }),
      h('div', { class: 'user-menu-item danger', onclick: function () { logout(); } }, '⏻  退出登录')
    ]);

    var chip = h('div', {
      class: 'user-chip',
      onmouseenter: function () { menu.classList.remove('hidden'); },
      onmouseleave: function () { menu.classList.add('hidden'); }
    }, [
      h('span', { class: 'avatar', text: (user.name || '用').charAt(0) }),
      h('span', { class: 'user-name', text: user.alias || user.name || '' }),
      menu
    ]);

    return h('div', { class: 'header' }, [
      left,
      h('div', { class: 'header-right' }, [
        h('a', { class: 'header-home-btn', href: 'index.html' }, '总入口'),
        h('button', {
          class: 'header-doc-btn', type: 'button',
          onclick: function () { KIT.docDrawer(state.platform + '/' + activeKey); }
        }, '需求说明'),
        chip
      ])
    ]);
  }

  /* ---------------- 视图分发 ---------------- */
  function renderView(module) {
    var v = DG.views[state.platform];
    if (!v || typeof v[module] !== 'function') {
      return h('div', { class: 'empty', text: '页面建设中：' + module });
    }
    var api = v[module]();
    return api && api.el ? api.el : api;
  }

  /* ---------------- 主渲染 ---------------- */
  function render() {
    UI.clear(appEl);
    var r = parse();

    /* 登录页 */
    if (r.p0 === 'login' || !state.user) {
      if (r.p0 === 'login' && r.p1 === 'jds' && BUILD !== 'web') appEl.appendChild(DG.views.login.jdsLogin());
      else if (BUILD === 'jds') appEl.appendChild(DG.views.login.jdsLogin());
      else appEl.appendChild(DG.views.login.webLogin());
      return;
    }

    /* 已登录：校验平台合法性 */
    var cfg = MENUS[r.p0];
    if (!cfg) { go(DEFAULT_ROUTE[state.platform] || '#/login'); return; }
    state.platform = r.p0;

    var module = r.p1 || cfg.items[0].key;
    var content = h('div', { class: 'content' }, renderView(module));

    appEl.appendChild(h('div', { class: 'app-shell' }, [
      renderSider(cfg, module),
      h('div', { class: 'main' }, [
        renderHeader(cfg, module),
        content
      ])
    ]));
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    S.init();
    window.addEventListener('hashchange', render);
    if (!location.hash) location.hash = '#/login';
    render();
  }

  return {
    state: state,
    enter: enter,
    switchPlatform: switchPlatform,
    logout: logout,
    go: go,
    render: render,
    boot: boot
  };
})();

DG.app.boot();
