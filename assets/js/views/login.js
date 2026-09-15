/* ===========================================================
   登录页
   - 数字网格 Web（项目端 / 工地端 同地址）登录 → 按身份分流
   - 数字化管理平台（JDS）独立登录
   =========================================================== */
window.DG = window.DG || {};
DG.views = DG.views || {};

DG.views.login = (function () {
  var UI = DG.ui;
  var h = UI.h;
  var BUILD = String(window.DG_BUILD || 'all').toLowerCase();

  /* 按 BUILD 过滤演示账号：jds→只有内部员工；web/all→包含 JDS、项目、工地账号 */
  function demoAccounts() {
    var ALL = DG.data.accounts;
    if (BUILD === 'jds') return ALL.filter(function (a) { var u = DG.store.find('users', a.userId); return u && u.userType === 1; });
    if (BUILD === 'web') return ALL;
    return ALL;
  }

  /* ---------------- 品牌区（共用） ---------------- */
  function brand(title, sub, tags) {
    return h('div', { class: 'login-brand' }, [
      h('div', { class: 'brand-logo' }, [
        h('span', { class: 'brand-mark', text: '网' }),
        h('span', { class: 'brand-name', text: '数字网格系统' })
      ]),
      h('div', { class: 'brand-copy' }, [
        h('div', { class: 'brand-title', text: title }),
        h('div', { class: 'brand-sub', html: sub }),
        h('div', { class: 'brand-tags' }, (tags || []).map(function (t) {
          return h('span', { class: 'brand-tag', text: t });
        }))
      ]),
      h('div', { class: 'brand-foot', text: '© 2026 数字网格系统 · 高保真交互原型（演示数据）' })
    ]);
  }

  /* ---------------- 登录表单 ---------------- */
  function loginForm(cfg) {
    var accInput = h('input', { class: 'input', type: 'text', placeholder: '请输入手机号', autocomplete: 'off' });
    var pwdInput = h('input', { class: 'input', type: 'password', placeholder: '请输入密码', autocomplete: 'off' });

    var accField = h('div', { class: 'field', 'data-key': 'account' }, [
      h('label', { class: 'field-label' }, [h('span', { class: 'req', text: '*' }), '账号']),
      accInput,
      h('div', { class: 'form-error', text: '' })
    ]);
    var pwdField = h('div', { class: 'field', 'data-key': 'password' }, [
      h('label', { class: 'field-label' }, [h('span', { class: 'req', text: '*' }), '密码']),
      pwdInput,
      h('div', { class: 'form-error', text: '' })
    ]);

    var form = h('div', {}, [accField, pwdField]);

    function submit() {
      var errors = UI.validate([
        { key: 'account', label: '账号', required: true },
        { key: 'password', label: '密码', required: true }
      ], { account: accInput.value, password: pwdInput.value });
      UI.showErrors(form, errors);
      if (Object.keys(errors).length) return;

      var res = DG.store.loginByPhone(accInput.value.trim(), pwdInput.value);
      if (!res.ok) { UI.toast(res.msg, 'error'); return; }
      cfg.onSuccess(res.user);
    }

    pwdInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    accInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });

    /* 演示账号快捷入口 */
    var quick = h('div', { class: 'login-quick' }, (cfg.accounts || []).map(function (a) {
      return h('button', {
        class: 'quick-btn', type: 'button',
        onclick: function () { accInput.value = a.phone; pwdInput.value = a.password; UI.clear(form.querySelector('.form-error')); submit(); }
      }, a.desc);
    }));

    var card = h('div', { class: 'login-card' }, [
      h('div', { class: 'login-title', text: cfg.title }),
      h('div', { class: 'login-desc', text: cfg.desc }),
      form,
      h('button', { class: 'btn btn-primary btn-lg btn-block', type: 'button', onclick: submit }, '登 录'),
      h('div', { class: 'login-extra' }, [
        h('div', { class: 'text-xs muted mb-md', text: '演示账号（点击直接登录，密码均为 123456）：' }),
        quick,
        cfg.switchLink,
        h('div', { class: 'mt-lg text-sm' }, [
          h('a', { href: 'index.html', text: '← 返回原型总入口' })
        ])
      ])
    ]);

    return h('div', { class: 'login-panel' }, card);
  }

  /* ---------------- 数字网格 Web 登录（项目端 / 工地端 同地址） ---------------- */
  function webLogin() {
    var page = h('div', { class: 'login-page' }, [
      brand('数字网格 Web',
        '工程建设全过程数字化管理<br/>项目端与工地端同一地址，登录后按身份自动进入',
        ['项目端', '工地端', '网格管理', '巡检任务']),
      loginForm({
        title: '欢迎登录',
        desc: '数字网格 Web · 项目端 / 工地端 / JDS 用户',
        accounts: demoAccounts(),
        switchLink: BUILD !== 'jds' ? h('div', { class: 'mt-lg text-sm' }, [
          '内部管理人员？',
          h('a', { href: '#/login/jds', text: '前往数字化管理平台登录' })
        ]) : null,
        onSuccess: function (user) { afterWebLogin(user); }
      })
    ]);
    return page;
  }

  /* ---------------- 数字化管理平台（JDS）登录 ---------------- */
  function jdsLogin() {
    var page = h('div', { class: 'login-page' }, [
      brand('数字化管理平台',
        '公司级统一管理与运营后台<br/>用户 · 角色 · 工程项目 · 工地 全量管理',
        ['用户管理', '角色权限', '项目审批', '工地审批']),
      loginForm({
        title: '管理平台登录',
        desc: '数字化管理平台 · 仅限内部账号',
        accounts: demoAccounts(),
        switchLink: BUILD !== 'web' ? h('div', { class: 'mt-lg text-sm' }, [
          '项目 / 工地用户？',
          h('a', { href: '#/login', text: '前往数字网格 Web 登录' })
        ]) : null,
        onSuccess: function (user) {
          if (user.userType !== 1) { UI.toast('该账号无数字化管理平台权限', 'error'); return; }
          DG.app.enter(user, 'jds', {});
        }
      })
    ]);
    return page;
  }

  /* ---------------- 登录后分流（Q10） ---------------- */
  function afterWebLogin(user) {
    /* 工地用户 → 工地端；项目用户 → 项目端；JDS 用户 → 选择进入 */
    if (user.userType === 3) {
      DG.app.enter(user, 'site', { siteId: user.siteId || 's1' });
      return;
    }
    if (user.userType === 2) {
      DG.app.enter(user, 'project', { projectId: user.projectId || 'p1' });
      return;
    }
    /* JDS 用户：同时关联项目与工地 → 弹出选择 */
    choosePlatform(user);
  }

  /* JDS 选择进入：项目 / 工地两个列表，每项独立确认 */
  function choosePlatform(user) {
    function optionMatches(name, meta, keyword) {
      var kw = String(keyword || '').trim().toLowerCase();
      if (!kw) return true;
      return (String(name || '') + ' ' + String(meta || '')).toLowerCase().indexOf(kw) >= 0;
    }

    function buildPanel(kind, title, items) {
      var search = h('input', {
        class: 'enter-choice-search',
        type: 'text',
        placeholder: kind === 'project' ? '搜索项目名称' : '搜索工地名称 / 所属项目'
      });
      var list = h('div', { class: 'enter-choice-list' });
      var count = h('span', { class: 'enter-choice-count' });

      function render() {
        UI.clear(list);
        var visible = items.filter(function (item) {
          return optionMatches(item.name, item.meta, search.value);
        });
        count.textContent = visible.length + ' 个';
        if (!visible.length) {
          list.appendChild(h('div', { class: 'enter-choice-empty', text: '暂无匹配结果' }));
          return;
        }
        visible.forEach(function (item) {
          var button = h('button', {
            class: 'btn btn-primary',
            type: 'button',
            onclick: function () {
              m.close();
              if (kind === 'project') DG.app.enter(user, 'project', { projectId: item.id });
              else DG.app.enter(user, 'site', { siteId: item.id });
            }
          }, kind === 'project' ? '进入项目' : '进入工地');
          list.appendChild(h('div', { class: 'enter-choice-row' }, [
            h('div', { class: 'enter-choice-main' }, [
              h('div', { class: 'enter-choice-name', text: item.name }),
              h('div', { class: 'enter-choice-meta', text: item.meta })
            ]),
            button
          ]));
        });
      }

      search.addEventListener('input', render);
      render();
      return h('section', { class: 'enter-choice-panel' }, [
        h('div', { class: 'enter-choice-head' }, [
          h('span', { text: title }),
          count
        ]),
        search,
        list
      ]);
    }

    var projectItems = DG.store.list('projects').map(function (p) {
      return {
        id: p.id,
        name: p.name,
        meta: '审批状态：' + (p.status || '—') + ' · 关联工地 ' + ((p.siteIds || []).length) + ' 个'
      };
    });
    var siteItems = DG.store.list('sites').map(function (site) {
      return {
        id: site.id,
        name: site.name,
        meta: (site.projectId ? DG.store.projectName(site.projectId) : '独立工地') + ' · 审批：' + (site.approveStatus || '—') + ' · 状态：' + (site.siteStatus || '—')
      };
    });

    var body = h('div', { class: 'enter-choice' }, [
      h('div', { class: 'enter-choice-tip', text: '选择要进入的项目或工地，每个列表支持搜索，点击对应按钮即可进入。' }),
      h('div', { class: 'enter-choice-grid' }, [
        buildPanel('project', '项目列表', projectItems),
        buildPanel('site', '工地列表', siteItems)
      ])
    ]);
    var footer = [
      h('button', { class: 'btn', type: 'button', onclick: function () { m.close(); } }, '关闭')
    ];
    var m = UI.modal({ title: '选择进入项目 / 工地', size: 'xl', body: body, footer: footer });
  }

  return {
    webLogin: webLogin,
    jdsLogin: jdsLogin,
    choosePlatform: choosePlatform
  };
})();
