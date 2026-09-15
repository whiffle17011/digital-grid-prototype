/* ===========================================================
   页面构建工具箱：表单弹窗 + 通用列表页
   目的：三端十余个模块复用同一套骨架，保证规范一致
   =========================================================== */
window.DG = window.DG || {};

DG.kit = (function () {
  var UI = DG.ui;
  var h = UI.h;

  /* =========================================================
     表单弹窗
     opts: {
       title, size, width,
       fields: [{key,label,type,required,options,placeholder,maxLength,tip,pattern,message,showIf,defaultValue}],
       values: {},            // 初始值（编辑）
       okText, cancelText,
       onSubmit(values, close)   // 返回 false 阻止关闭；返回 {fieldKey:'错误'} 显示错误
     }
     ========================================================= */
  function formModal(opts) {
    var values = Object.assign({}, opts.values || {});
    var controls = {};
    var form = h('div', {});

    /* 解析字段说明：优先字段显式 help，其次按 docKey 从 DG.doc 取 */
    function resolveHelp(f) {
      if (f.help) return f.help;
      if (opts.docKey && DG.doc) return DG.doc.fieldHelp(opts.docKey, f.key);
      return null;
    }

    (opts.fields || []).forEach(function (f) {
      var ctrl;
      var val = values[f.key] !== undefined ? values[f.key] : (f.defaultValue !== undefined ? f.defaultValue : (f.type === 'multiselect' ? [] : ''));

      if (f.type === 'select' || f.type === 'multiselect') {
        ctrl = UI.select({
          value: val,
          options: f.options || [],
          multiple: f.type === 'multiselect',
          placeholder: f.placeholder || '请选择',
          width: '100%'
        });
        controls[f.key] = { get: function () { return ctrl.getValue(); }, el: ctrl };

      } else if (f.type === 'textarea') {
        var ta = h('textarea', {
          class: 'textarea',
          placeholder: f.placeholder || '',
          maxlength: f.maxLength || 200,
          rows: f.rows || 3
        });
        ta.value = val || '';
        ctrl = ta;
        controls[f.key] = { get: function () { return ta.value; }, el: ta };

      } else if (f.type === 'tree') {
        var treeWrap = h('div', {}, [
          h('div', { class: 'flex gap-sm mb-md' }, [
            h('button', {
              class: 'btn btn-text', type: 'button',
              onclick: function () { tr.checkAll(); }
            }, '全选'),
            h('button', {
              class: 'btn btn-text', type: 'button',
              onclick: function () { tr.uncheckAll(); }
            }, '清空')
          ]),
          h('div', { style: { maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px' } })
        ]);
        var treeBox = treeWrap.lastChild;
        var tr = UI.tree({
          nodes: f.nodes || DG.store.menuTree(),
          checkable: true,
          checked: (val && val.checked) || val || [],
          allSelected: (val && val.allSelected) || [],
          expandAll: f.expandAll !== false
        });
        treeBox.appendChild(tr);
        ctrl = treeWrap;
        controls[f.key] = {
          get: function () { return { checked: tr.getChecked(), allSelected: tr.getAllSelected() }; },
          getChecked: function () { return tr.getChecked(); },
          getAllSelected: function () { return tr.getAllSelected(); },
          el: tr
        };
        tr.addEventListener('click', function () { tr._v = tr.getChecked(); });

      } else if (f.type === 'radio') {
        var radioWrap = h('div', { class: 'flex gap-lg', style: { height: '32px', alignItems: 'center' } });
        var rVal = val || '';
        (f.options || []).forEach(function (o) {
          var item = h('span', {
            class: 'radio' + (rVal === o.value ? ' is-checked' : ''),
            onclick: function () {
              rVal = o.value;
              Array.prototype.forEach.call(radioWrap.children, function (c) { c.classList.remove('is-checked'); });
              item.classList.add('is-checked');
            }
          }, [h('span', { class: 'box' }, '●'), h('span', { text: o.label })]);
          radioWrap.appendChild(item);
        });
        ctrl = radioWrap;
        controls[f.key] = { get: function () { return rVal; }, el: radioWrap };

      } else if (f.type === 'button') {
        /* 触发按钮：不参与收集，点击执行 f.onClick(btn, event) */
        var btn = h('button', {
          class: 'btn ' + (f.btnType || 'btn-default'),
          type: 'button',
          onclick: function (e) { if (f.onClick) f.onClick(btn, e); }
        }, f.text || '按钮');
        ctrl = h('div', {}, [btn]);
        controls[f.key] = { get: function () { return undefined; }, el: btn };

      } else {
        /* input / date / number */
        var ipt = h('input', {
          class: 'input',
          type: f.type === 'date' ? 'date' : (f.type === 'number' ? 'number' : 'text'),
          placeholder: f.placeholder || '',
          maxlength: f.maxLength || 200
        });
        ipt.value = val || '';
        ctrl = ipt;
        controls[f.key] = { get: function () { return ipt.value; }, el: ipt };
      }

      var fieldEl = h('div', { class: 'field', 'data-key': f.key }, [
        f.label ? h('label', { class: 'field-label' }, [
          f.required ? h('span', { class: 'req', text: '*' }) : null,
          f.label,
          helpIcon(resolveHelp(f))
        ]) : null,
        ctrl,
        f.tip ? h('div', { class: 'field-tip', text: f.tip }) : null,
        h('div', { class: 'form-error', text: '' })
      ]);
      if (f.showIf) fieldEl.setAttribute('data-showif', f.key);
      form.appendChild(fieldEl);
    });

    /* 条件显示 */
    function applyShowIf() {
      (opts.fields || []).forEach(function (f) {
        if (!f.showIf) return;
        var el = form.querySelector('[data-key="' + f.key + '"]');
        if (!el) return;
        var v = controls[f.showIf.key] ? controls[f.showIf.key].get() : null;
        var show = f.showIf.test(v);
        el.style.display = show ? '' : 'none';
      });
    }
    (opts.fields || []).forEach(function (f) {
      if (!f.showIf) return;
      var dep = controls[f.showIf.key];
      if (dep && dep.el && dep.el.addEventListener) {
        dep.el.addEventListener('change', applyShowIf);
        dep.el.addEventListener('click', applyShowIf);
      }
    });
    applyShowIf();

    function collect() {
      var out = {};
      Object.keys(controls).forEach(function (k) { out[k] = controls[k].get(); });
      return out;
    }

    function rules() {
      return (opts.fields || []).filter(function (f) { return f.required || f.maxLength || f.pattern; })
        .map(function (f) {
          return {
            key: f.key, label: f.label || f.key,
            required: f.required && (!f.showIf || f.showIf.test(controls[f.showIf.key] ? controls[f.showIf.key].get() : null)),
            maxLength: f.maxLength, pattern: f.pattern, message: f.message
          };
        });
    }

    var m = UI.modal({
      title: opts.title,
      size: opts.size,
      okText: opts.okText || '确认',
      cancelText: opts.cancelText || '取消',
      body: form,
      onOk: function (close) {
        var vals = collect();
        var errs = UI.validate(rules(), vals);
        if (Object.keys(errs).length) { UI.showErrors(form, errs); return false; }
        var extra = opts.onSubmit ? opts.onSubmit(vals, close) : null;
        if (extra && typeof extra === 'object') { UI.showErrors(form, extra); return false; }
        if (extra === false) return false;
        return true;
      }
    });
    return m;
  }

  /* =========================================================
     通用列表页
     opts: {
       title, sub,
       filters: [{key,label,type:'input'|'select',placeholder,options,width}],
       columns: [...],
       load(params) -> 过滤后的完整数组,
       addButton: {text, onClick} | null,
       extraToolbar: DOM | null,
       pageSize
     }
     ========================================================= */
  function listPage(opts) {
    var params = {};
    var page = 1;
    var size = opts.pageSize || 10;
    var filterControls = {};

    var root = h('div', {});
    var tableHolder = h('div', {});

    /* 筛选栏 */
    var filterBar = h('div', { class: 'filter-bar' });
    (opts.filters || []).forEach(function (f) {
      var ctrl;
      if (f.type === 'select') {
        ctrl = UI.select({
          value: '',
          options: DG.store.withAll(f.options || [], f.allText || ('全部' + f.label)),
          placeholder: f.placeholder || ('全部' + f.label),
          width: f.width || 160
        });
      } else {
        var ipt = h('input', { class: 'input', type: 'text', placeholder: f.placeholder || '' });
        ipt.style.width = (f.width || 200) + 'px';
        ipt.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(); });
        ctrl = ipt;
      }
      filterControls[f.key] = ctrl;
      filterBar.appendChild(h('div', { class: 'filter-item' }, ctrl));
    });

    filterBar.appendChild(h('div', { class: 'filter-actions' }, [
      h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { doSearch(); } }, '查询'),
      h('button', {
        class: 'btn', type: 'button',
        onclick: function () {
          Object.keys(filterControls).forEach(function (k) {
            var c = filterControls[k];
            if (c.getValue) c.setValue(''); else c.value = '';
          });
          params = {}; page = 1; render();
        }
      }, '重置')
    ]));

    function collectParams() {
      var p = {};
      Object.keys(filterControls).forEach(function (k) {
        var c = filterControls[k];
        p[k] = c.getValue ? c.getValue() : c.value;
      });
      return p;
    }

    function doSearch() { params = collectParams(); page = 1; render(); }

    function render() {
      UI.clear(tableHolder);
      var all = opts.load(params) || [];
      var pg = DG.store.paginate(all, page, size);

      var card = h('div', { class: 'card card-no-pad' }, [
        h('div', { class: 'card-toolbar' }, [
          h('div', { class: 'ct-title', text: opts.listTitle || (opts.title + '列表') }),
          h('div', { class: 'flex gap-sm' }, [
            opts.extraToolbar || null,
            opts.addButton ? h('button', {
              class: 'btn btn-primary', type: 'button',
              onclick: function () { opts.addButton.onClick(api); }
            }, opts.addButton.text) : null
          ])
        ]),
        h('div', { class: 'card-body' }, [
          UI.table({ columns: opts.columns, rows: pg.rows, empty: opts.emptyText }),
          pg.total > size ? UI.pagination({
            total: pg.total, page: pg.page, size: size,
            onChange: function (p) { page = p; render(); }
          }) : (pg.total ? h('div', { class: 'pagination' }, h('div', { text: '共 ' + pg.total + ' 条' })) : null)
        ])
      ]);
      tableHolder.appendChild(card);
    }

    root.appendChild(h('div', { class: 'page-head' }, [
      h('div', {}, [
        h('div', { class: 'page-title', text: opts.title }),
        opts.sub ? h('div', { class: 'page-sub', text: opts.sub }) : null
      ]),
      opts.headRight || null
    ]));
    if ((opts.filters || []).length) root.appendChild(filterBar);
    root.appendChild(tableHolder);

    var api = {
      el: root,
      reload: function () { render(); },
      getParams: function () { return params; }
    };
    render();
    return api;
  }

  /* ---------------- 删除确认（统一文案，可带具体名称） ---------------- */
  /* opts：字符串 = 提示语；对象 = { name, tip } */
  function confirmDelete(what, onOk, opts) {
    opts = opts || {};
    if (typeof opts === 'string') opts = { tip: opts };
    var target = opts.name ? '「' + opts.name + '」' + what : '该' + what;
    UI.confirm({
      title: '删除' + what,
      content: '确认删除' + target + '吗？',
      okText: '确认删除',
      danger: true,
      tip: opts.tip || '',
      onOk: onOk
    });
  }

  /* ---------------- 操作列链接 ---------------- */
  function ops(links) {
    return h('div', { class: 'cell-ops' }, links.map(function (l) {
      return h('a', {
        class: 'btn btn-text' + (l.danger ? ' danger' : ''),
        href: 'javascript:void(0)',
        onclick: l.onClick
      }, l.text);
    }));
  }

  /* ---------------- 详情弹窗（描述列表 + 时间线） ---------------- */
  function detailModal(opts) {
    var body = h('div', {}, [
      h('div', { class: 'desc-list' }, (opts.items || []).map(function (it) {
        return h('div', { class: 'desc-item' + (it.full ? ' full' : '') }, [
          h('span', { class: 'k', text: it.k }),
          h('span', { class: 'v' }, typeof it.v === 'string' ? it.v : it.v)
        ]);
      })),
      (opts.records && opts.records.length) ? h('div', { class: 'mt-xl' }, [
        h('div', { class: 'text-bold mb-lg', text: '审批记录' }),
        h('div', { class: 'timeline' }, opts.records.map(function (r) {
          return h('div', { class: 'timeline-item' }, [
            h('div', { class: 'timeline-title', text: r.action }),
            h('div', { class: 'timeline-meta', text: r.time + ' · ' + r.user }),
            r.opinion ? h('div', { class: 'timeline-desc', text: '意见：' + r.opinion }) : null
          ]);
        }))
      ]) : null
    ]);

    return UI.modal({
      title: opts.title,
      size: opts.size || '',
      body: body,
      footer: opts.footer,
      okText: opts.okText,
      cancelText: opts.cancelText,
      onOk: opts.onOk
    });
  }

  /* ---------------- 审批弹窗（通过/驳回 + 意见必填） ---------------- */
  function approveModal(opts) {
    var result = '通过';
    var opinion = h('textarea', { class: 'textarea', rows: 3, maxlength: 200, placeholder: '请输入审批意见（≤200 字）' });
    var errBox = h('div', { class: 'form-error', text: '' });

    var radioWrap = h('div', { class: 'flex gap-lg' }, [
      { v: '通过', label: '通过' }, { v: '驳回', label: '驳回' }
    ].map(function (o) {
      var item = h('span', {
        class: 'radio' + (o.v === '通过' ? ' is-checked' : ''),
        onclick: function () {
          result = o.v;
          Array.prototype.forEach.call(radioWrap.children, function (c) { c.classList.remove('is-checked'); });
          item.classList.add('is-checked');
        }
      }, [h('span', { class: 'box' }, '●'), h('span', { text: o.label })]);
      return item;
    }));

    var body = h('div', {}, [
      h('div', { class: 'field' }, [
        h('label', { class: 'field-label' }, [h('span', { class: 'req', text: '*' }), '审批结果']),
        radioWrap
      ]),
      h('div', { class: 'field' }, [
        h('label', { class: 'field-label' }, [h('span', { class: 'req', text: '*' }), '审批意见']),
        opinion,
        h('div', { class: 'field-tip', text: '≤200 字' })
      ]),
      errBox
    ]);

    return UI.modal({
      title: opts.title || '审批',
      size: 'sm',
      body: body,
      onOk: function () {
        if (!opinion.value.trim()) {
          errBox.textContent = '请输入审批意见';
          return false;
        }
        opts.onSubmit({ result: result, opinion: opinion.value.trim() });
        return true;
      }
    });
  }

  /* ---------------- 字段说明 ⓘ 图标 ---------------- */
  /* help：字符串 或 {n,label,help}；tooltip 用 fixed 定位，避免被弹窗裁剪 */
  function helpIcon(help) {
    var text = null, num = null;
    if (!help) return null;
    if (typeof help === 'string') text = help;
    else { text = help.help; num = help.n; }
    if (!text) return null;

    var tip = h('span', { class: 'help-tip' }, [
      num ? h('span', { class: 'help-tip-num', text: num }) : null,
      h('span', { text: text })
    ]);
    var icon = h('span', { class: 'help-icon', title: text }, ['i', tip]);

    icon.addEventListener('mouseenter', function () {
      var r = icon.getBoundingClientRect();
      tip.style.left = (r.left + 22) + 'px';
      tip.style.top = (r.top - 8) + 'px';
      tip.style.display = 'block';
    });
    icon.addEventListener('mouseleave', function () {
      tip.style.display = 'none';
    });
    return icon;
  }

  /* ---------------- 页面「需求说明」研发面板 ---------------- */
  function docDrawer(routeKey) {
    var doc = DG.doc && DG.doc.get(routeKey);
    if (!doc) { UI.toast('暂无该页面的需求说明', 'info'); return; }

    var mask = h('div', { class: 'doc-mask' });
    var panel = h('div', { class: 'doc-drawer' });
    function close() { if (mask.parentNode) mask.parentNode.removeChild(mask); }

    panel.appendChild(h('div', { class: 'doc-head' }, [
      h('div', {}, [
        h('div', { class: 'doc-title', text: '需求说明 · ' + doc.title }),
        h('div', { class: 'doc-prd', text: '来源：' + doc.prd + ' · 研发详细版' })
      ]),
      h('button', { class: 'doc-close', type: 'button', onclick: close, title: '关闭' }, '✕')
    ]));

    var body = h('div', { class: 'doc-body' });
    var nav = h('div', { class: 'doc-tabs' });
    body.appendChild(nav);

    function addNav(label, id, count) {
      var btn = h('button', {
        class: 'doc-tab', type: 'button',
        onclick: function () {
          var target = document.getElementById(id);
          if (target) body.scrollTop = target.offsetTop - nav.offsetHeight - 8;
        }
      }, [
        h('span', { text: label }),
        count !== undefined ? h('span', { class: 'doc-tab-count', text: String(count) }) : null
      ]);
      nav.appendChild(btn);
    }

    function addSection(id, title, count) {
      var sec = h('section', { class: 'doc-section', id: id });
      sec.appendChild(h('div', { class: 'doc-sec-title' }, [
        h('span', { text: title }),
        count !== undefined ? h('span', { class: 'doc-sec-count', text: count + ' 项' }) : null
      ]));
      body.appendChild(sec);
      addNav(title, id, count);
      return sec;
    }

    function addItems(container, items, kind) {
      (items || []).forEach(function (it) {
        var num = kind === 'field' ? it.n : (kind === 'rule' ? 'R' + it.n : (kind === 'exception' ? 'X' + it.n : 'L' + it.n));
        container.appendChild(h('div', { class: 'doc-item' }, [
          h('span', { class: 'doc-num' + (kind === 'rule' || kind === 'exception' ? ' doc-num-rule' : ''), text: num }),
          h('div', { class: 'doc-item-body' }, [
            kind === 'field' && it.label ? h('div', { class: 'doc-item-label', text: it.label }) : null,
            h('div', { class: 'doc-item-text', text: it.help || it.text })
          ])
        ]));
      });
    }

    /* 页面概览 */
    var summary = doc.summary || {};
    var overview = addSection('doc-overview', '页面概览');
    overview.appendChild(h('div', { class: 'doc-summary-grid' }, [
      h('div', { class: 'doc-summary-card' }, [h('span', { text: '页面目标' }), h('strong', { text: summary.purpose || '—' })]),
      h('div', { class: 'doc-summary-card' }, [h('span', { text: '使用角色' }), h('strong', { text: summary.actors || '—' })]),
      h('div', { class: 'doc-summary-card' }, [h('span', { text: '主要入口' }), h('strong', { text: summary.entry || '—' })]),
      h('div', { class: 'doc-summary-card' }, [h('span', { text: '数据依赖' }), h('strong', { text: summary.dependencies || '—' })])
    ]));

    /* 字段说明 */
    var fieldList = doc.fields ? Object.keys(doc.fields).map(function (k) { return doc.fields[k]; }) : [];
    if (fieldList.length) addItems(addSection('doc-fields', '字段规则', fieldList.length), fieldList, 'field');

    /* 功能逻辑 */
    if (doc.logic && doc.logic.length) addItems(addSection('doc-logic', '功能逻辑', doc.logic.length), doc.logic, 'logic');

    /* 业务流程 */
    if (doc.flows && doc.flows.length) {
      var flowSec = addSection('doc-flows', '业务流程', doc.flows.length);
      doc.flows.forEach(function (flow) {
        var flowBox = h('div', { class: 'doc-flow' });
        flowBox.appendChild(h('div', { class: 'doc-flow-title' }, [
          h('span', { class: 'doc-flow-code', text: flow.n || '' }),
          h('span', { text: flow.name || '业务流程' })
        ]));
        (flow.steps || []).forEach(function (step, idx) {
          var node = h('div', { class: 'doc-flow-node is-' + (step.type || 'action') }, [
            h('div', { class: 'doc-flow-index', text: String(idx + 1) }),
            h('div', { class: 'doc-flow-main' }, [
              h('div', { class: 'doc-flow-node-title', text: step.title || '' }),
              step.text ? h('div', { class: 'doc-flow-node-text', text: step.text }) : null,
              step.branches && step.branches.length ? h('div', { class: 'doc-flow-branches' }, step.branches.map(function (b) {
                return h('div', { class: 'doc-flow-branch' }, [
                  h('span', { class: 'doc-flow-branch-label', text: b.label || '' }),
                  h('span', { text: b.text || '' })
                ]);
              })) : null
            ])
          ]);
          flowBox.appendChild(node);
        });
        if (flow.note) flowBox.appendChild(h('div', { class: 'doc-flow-note', text: '处理说明：' + flow.note }));
        flowSec.appendChild(flowBox);
      });
    }

    /* 异常与边界 */
    var rules = (doc.rules || []).slice();
    var exceptions = (doc.exceptions || []).slice();
    if (rules.length || exceptions.length) {
      var exSec = addSection('doc-exceptions', '异常与边界', rules.length + exceptions.length);
      addItems(exSec, rules, 'rule');
      addItems(exSec, exceptions, 'exception');
    }

    /* 验收要点 */
    if (doc.acceptance && doc.acceptance.length) {
      var accSec = addSection('doc-acceptance', '验收要点', doc.acceptance.length);
      doc.acceptance.forEach(function (text, idx) {
        accSec.appendChild(h('div', { class: 'doc-accept-item' }, [
          h('span', { class: 'doc-accept-check', text: '✓' }),
          h('span', { text: text })
        ]));
      });
    }

    panel.appendChild(body);
    mask.appendChild(panel);
    mask.addEventListener('mousedown', function (e) { if (e.target === mask) close(); });
    document.getElementById('modal-root').appendChild(mask);
    return { close: close };
  }

  return {
    formModal: formModal,
    listPage: listPage,
    confirmDelete: confirmDelete,
    ops: ops,
    detailModal: detailModal,
    approveModal: approveModal,
    docDrawer: docDrawer
  };
})();
