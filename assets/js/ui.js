/* ===========================================================
   UI 组件库（原生 DOM，无依赖）
   modal / confirm / toast / select / tree(全选·半选) / table
   / pagination / field / tag / crumb / empty
   =========================================================== */
window.DG = window.DG || {};

DG.ui = (function () {

  /* ---------------- DOM 构建助手 ---------------- */
  var BUTTON_HELP = {
    '查询': '按当前筛选条件重新查询列表，结果受当前项目/工地和权限范围限制。',
    '重置': '清空搜索词和筛选条件，恢复到默认列表范围。',
    '登 录': '校验账号、密码和用户类型，通过后按身份进入对应平台或项目/工地。',
    '总入口': '返回原型总入口，不改变当前业务数据。',
    '需求说明': '打开当前页面的研发需求面板，查看字段、逻辑、流程、异常和验收要点。',
    '新增': '打开新增表单；提交前执行必填、格式、唯一性和权限校验。',
    '编辑': '打开编辑表单；保存时校验唯一性、状态和关联数据，成功后刷新列表。',
    '删除': '执行删除前二次确认，并校验关联用户、角色、任务或业务数据。',
    '详情': '查看当前记录的业务信息、关联数据、菜单配置和审批记录。',
    '审批': '仅具备对应审批菜单权限且状态为待审批时显示；审批意见必填。',
    '权限配置': '编辑角色的菜单和操作权限；保存后按角色类型决定是否同步。',
    '关联用户': '打开左右双栏用户选择；左侧可关联，右侧已关联，保存后更新授权。',
    '同步至工地': '选择需要覆盖同步的项目下工地，可多选；同名默认角色按项目端权限覆盖。',
    '保存': '校验并保存当前修改；成功后关闭弹窗并刷新业务数据。',
    '确认': '确认并提交当前操作；请先核对弹窗中的信息和校验提示。',
    '取消': '关闭当前弹窗，不保存本次未提交的修改。',
    '确认删除': '二次确认后执行逻辑删除；有关联数据时系统会阻止删除。',
    '关闭': '关闭当前弹窗或面板，不影响已经保存的数据。',
    '全选': '选择当前列表或权限树中的全部有效项。',
    '清空': '清除当前列表或权限树中的已选项。',
    '添加下级': '在当前单位节点下新增一个下级单位，并继承项目范围。',
    '停用': '将记录设为停用状态；停用后不能用于新增关联，历史数据保留。',
    '启用': '将记录恢复为启用状态，可重新用于新增关联。',
    '进入项目': '进入所选项目端，并刷新项目上下文和页面数据。',
    '进入工地': '进入所选工地端，并同步该工地所属项目上下文。',
    '返回总入口': '返回原型总入口，不修改任何数据。',
    '查看缺省页': '打开缺省状态规范，查看空数据、异常、无权限等页面。',
    '返回上一页': '返回浏览器上一页；若无可返回页面则停留在当前页。',
    '重新加载': '重新请求当前页面数据，用于系统异常或数据刷新场景。',
    '刷新': '重新加载当前列表或详情数据。'
  };

  function buttonHelp(text) {
    var label = String(text || '').replace(/\s+/g, ' ').replace(/^[+×✕←→⇄⚑⟲⏻]+\s*/, '').trim();
    if (!label) return '';
    if (BUTTON_HELP[label]) return BUTTON_HELP[label];
    if (label.indexOf('新增') >= 0) return '打开新增表单；提交时执行字段、权限和业务唯一性校验。';
    if (label.indexOf('进入项目') >= 0) return '进入所选项目端，并刷新项目上下文和页面数据。';
    if (label.indexOf('进入工地') >= 0) return '进入所选工地端，并同步该工地所属项目上下文。';
    if (label.indexOf('删除') >= 0) return '删除前二次确认，并校验关联业务数据；通过后执行逻辑删除。';
    if (label.indexOf('编辑') >= 0) return '打开编辑表单；保存时校验状态、唯一性和关联数据。';
    if (label.indexOf('详情') >= 0) return '查看当前记录的详细信息、关联数据、菜单配置和审批记录。';
    if (label.indexOf('审批') >= 0) return '按审批菜单权限控制显示；审批结果和意见写入不可覆盖的审批记录。';
    if (label.indexOf('关联') >= 0) return '打开关联选择，按当前数据范围筛选可选对象，保存后立即刷新列表。';
    if (label.indexOf('同步') >= 0) return '按需求定义的覆盖策略同步配置，并返回逐项处理结果。';
    if (label.indexOf('返回') >= 0) return '返回上一级页面，不修改当前业务数据。';
    return '执行“' + label + '”操作；系统将按当前账号权限、数据范围和业务状态进行校验。';
  }

  function attachButtonHelp(el, props) {
    if (!el || (el.tagName !== 'BUTTON' && el.tagName !== 'A')) return;
    if (props && props.title) return;
    var help = buttonHelp(el.textContent || el.getAttribute('aria-label'));
    if (help) el.title = help;
  }

  function h(tag, props, children) {
    var e = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') { Object.keys(v).forEach(function (s) { e.style[s] = v[s]; }); }
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
        else e.setAttribute(k, v === true ? '' : v);
      });
    }
    append(e, children);
    attachButtonHelp(e, props);
    return e;
  }

  function append(parent, children) {
    if (children === null || children === undefined || children === false) return parent;
    if (Array.isArray(children)) {
      children.forEach(function (c) { append(parent, c); });
      return parent;
    }
    if (typeof children === 'string' || typeof children === 'number') {
      parent.appendChild(document.createTextNode(String(children)));
      return parent;
    }
    parent.appendChild(children);
    return parent;
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  /* ---------------- Toast ---------------- */
  var TOAST_ICON = { success: '✓', error: '✕', warning: '!', info: 'i' };
  function toast(msg, type) {
    type = type || 'success';
    var root = document.getElementById('toast-root');
    var t = h('div', { class: 'toast ' + type }, [
      h('span', { class: 'icon', text: TOAST_ICON[type] || 'i' }),
      h('span', { text: msg })
    ]);
    root.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .25s';
      t.style.opacity = '0';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
    }, 2200);
  }

  /* ---------------- 弹窗 ---------------- */
  function modal(opts) {
    var root = document.getElementById('modal-root');
    var mask = h('div', { class: 'mask' });
    var box = h('div', { class: 'modal' + (opts.size === 'xl' ? ' modal-xl' : opts.size === 'lg' ? ' modal-lg' : opts.size === 'sm' ? ' modal-sm' : '') });

    function close() { if (mask.parentNode) mask.parentNode.removeChild(mask); }

    /* 头部 */
    var header = h('div', { class: 'modal-header' }, [
      h('div', { class: 'modal-title', text: opts.title || '' }),
      h('button', { class: 'modal-close', type: 'button', onclick: close, title: '关闭' }, '✕')
    ]);
    box.appendChild(header);

    /* 主体 */
    var body = h('div', { class: 'modal-body' });
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else append(body, opts.body);
    box.appendChild(body);

    /* 底部：硬规范② —— 确认按钮永远在最右 */
    var footer = h('div', { class: 'modal-footer' });
    if (opts.footer === undefined || opts.footer === true) {
      var cancelText = opts.cancelText || '取消';
      var okText = opts.okText || '确认';
      footer.appendChild(h('button', {
        class: 'btn', type: 'button',
        onclick: function () {
          if (opts.onCancel) opts.onCancel(close); else close();
        }
      }, cancelText));
      footer.appendChild(h('button', {
        class: 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary'), type: 'button',
        onclick: function () {
          if (!opts.onOk) { close(); return; }
          var r = opts.onOk(close, body);
          if (r !== false) close();
        }
      }, okText));
    } else if (opts.footer) {
      append(footer, opts.footer);
    }
    if (opts.footer !== false) box.appendChild(footer);

    mask.appendChild(box);
    mask.addEventListener('mousedown', function (e) { if (e.target === mask) close(); });
    root.appendChild(mask);
    return { close: close, body: body, el: box };
  }

  /* 删除/操作确认框（[取消][确认删除]） */
  function confirm(opts) {
    return modal({
      title: opts.title || '操作确认',
      size: 'sm',
      danger: !!opts.danger,
      okText: opts.okText || '确认',
      body: h('div', {}, [
        h('div', { class: 'modal-confirm-text', text: opts.content || '' }),
        opts.tip ? h('div', { class: 'modal-confirm-tip', text: opts.tip }) : null
      ]),
      onOk: opts.onOk
    });
  }

  /* ---------------- 下拉选择（支持搜索） ---------------- */
  /* opts: {value, options:[{value,label}], multiple, searchable, placeholder, width, onChange} */
  function select(opts) {
    var multiple = !!opts.multiple;
    var searchable = opts.searchable !== false;   /* 默认可搜索 */
    var options = opts.options || [];
    var keyword = '';
    var value = multiple ? (opts.value || []) : (opts.value === undefined || opts.value === null ? '' : opts.value);
    var ph = opts.placeholder || '请选择';

    var valueBox = h('div', { class: 'select-value' });
    var trigger = h('div', { class: 'select-trigger' }, [valueBox, h('span', { class: 'select-arrow' }, '▼')]);
    var dropdown = h('div', { class: 'select-dropdown' });
    var wrap = h('div', { class: 'select' }, [trigger, dropdown]);
    if (opts.width) wrap.style.width = typeof opts.width === 'number' ? opts.width + 'px' : opts.width;

    function labelOf(v) {
      var f = options.filter(function (o) { return String(o.value) === String(v); })[0];
      return f ? f.label : v;
    }

    /* 搜索框 + 可滚动选项列表 */
    var searchInput = null;
    if (searchable) {
      searchInput = h('input', { class: 'select-search', type: 'text', placeholder: '搜索' });
      searchInput.addEventListener('click', function (e) { e.stopPropagation(); });
      searchInput.addEventListener('input', function () { keyword = searchInput.value; renderOptions(); });
      dropdown.appendChild(searchInput);
    }
    var listBox = h('div', { class: 'select-list' });
    dropdown.appendChild(listBox);

    function visibleOptions() {
      var kw = String(keyword).trim().toLowerCase();
      if (!kw) return options;
      return options.filter(function (o) {
        return String(o.label).toLowerCase().indexOf(kw) >= 0;
      });
    }

    function renderValue() {
      clear(valueBox);
      if (multiple) {
        if (!value.length) { valueBox.className = 'select-value placeholder'; valueBox.textContent = ph; return; }
        valueBox.className = 'select-value';
        var tags = h('div', { class: 'select-tags' });
        value.forEach(function (v) {
          tags.appendChild(h('span', { class: 'tag tag-primary' }, [
            labelOf(v),
            h('span', {
              style: { cursor: 'pointer', marginLeft: '4px' },
              onclick: function (e) {
                e.stopPropagation();
                value = value.filter(function (x) { return x !== v; });
                renderValue(); renderOptions();
                if (opts.onChange) opts.onChange(value.slice());
              }
            }, '✕')
          ]));
        });
        valueBox.appendChild(tags);
        return;
      }
      if (value === '' || value === null || value === undefined) {
        valueBox.className = 'select-value placeholder';
        valueBox.textContent = ph;
      } else {
        valueBox.className = 'select-value';
        valueBox.textContent = labelOf(value);
      }
    }

    function renderOptions() {
      clear(listBox);
      var visible = visibleOptions();
      if (!visible.length) { listBox.appendChild(h('div', { class: 'select-empty', text: '暂无数据' })); return; }
      visible.forEach(function (o) {
        var selected = multiple ? value.indexOf(o.value) >= 0 : String(value) === String(o.value);
        listBox.appendChild(h('div', {
          class: 'select-option' + (selected ? ' is-selected' : ''),
          onclick: function (e) {
            e.stopPropagation();
            if (multiple) {
              var i = value.indexOf(o.value);
              if (i >= 0) value.splice(i, 1); else value.push(o.value);
            } else {
              value = o.value;
              wrap.classList.remove('is-open');
              if (searchInput) searchInput.value = '';
              keyword = '';
            }
            renderValue(); renderOptions();
            if (opts.onChange) opts.onChange(multiple ? value.slice() : value);
          }
        }, [
          h('span', { text: o.label }),
          selected ? h('span', { class: 'check', text: '✓' }) : null
        ]));
      });
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = wrap.classList.contains('is-open');
      closeAllSelects();
      if (!open) {
        wrap.classList.add('is-open');
        if (searchInput) {
          searchInput.value = '';
          keyword = '';
          renderOptions();
          setTimeout(function () { searchInput.focus(); }, 0);
        }
      }
    });

    renderValue(); renderOptions();

    wrap.getValue = function () { return multiple ? value.slice() : value; };
    wrap.setValue = function (v) { value = v; renderValue(); renderOptions(); };
    wrap.setOptions = function (list) { options = list || []; renderOptions(); };
    return wrap;
  }

  function closeAllSelects() {
    var list = document.querySelectorAll('.select.is-open');
    Array.prototype.forEach.call(list, function (s) { s.classList.remove('is-open'); });
  }
  document.addEventListener('click', closeAllSelects);

  /* ---------------- 树（支持复选 / 全选 / 半选 / 一级菜单全选） ---------------- */
  /* opts: {nodes, checkable, checked:[], allSelected:[], selectedId, onCheck(payload), onSelect(node), expandAll} */
  function tree(opts) {
    var nodes = opts.nodes || [];
    var checkable = !!opts.checkable;
    var checked = (opts.checked || []).slice();
    var allSelected = {};                       /* 一级菜单"全选"标记：{nodeId:true} */
    (opts.allSelected || []).forEach(function (id) { allSelected[id] = true; });
    var selectedId = opts.selectedId;
    var expanded = {};
    nodes.forEach(function (n) { expanded[n.id] = opts.expandAll !== false; });

    var root = h('div', { class: 'tree' });

    function leafIds(n) {
      if (!n.children || !n.children.length) return [n.id];
      var out = [];
      n.children.forEach(function (c) { out = out.concat(leafIds(c)); });
      return out;
    }
    function allIds(ns) {
      var out = [];
      ns.forEach(function (n) { out = out.concat(leafIds(n)); });
      return out;
    }

    /* 计算节点状态：0 未选 / 1 半选 / 2 全选（考虑了 allSelected + 兼容旧的一级ID勾选） */
    function stateOf(n) {
      if (allSelected[n.id]) return 2;          /* 一级菜单被标记"全选"= 全选 */
      if (checked.indexOf(n.id) >= 0) return 2; /* 兼容旧数据：一级ID在勾选列表 = 全选 */
      var ids = leafIds(n);
      var hit = 0;
      ids.forEach(function (id) { if (checked.indexOf(id) >= 0) hit++; });
      if (hit === 0) return 0;
      if (hit === ids.length) return 2;
      return 1;
    }

    function toggle(n, on) {
      var ids = leafIds(n);
      if (on) {
        ids.forEach(function (id) { if (checked.indexOf(id) < 0) checked.push(id); });
      } else {
        checked = checked.filter(function (id) { return ids.indexOf(id) < 0; });
      }
    }

    function notify() {
      if (opts.onCheck) opts.onCheck({ checked: checked.slice(), allSelected: Object.keys(allSelected) });
    }

    function render() {
      clear(root);
      nodes.forEach(function (n) { root.appendChild(renderNode(n, 0)); });
      notify();
    }

    function renderNode(n, depth) {
      var hasChild = !!(n.children && n.children.length);
      var isOpen = !!expanded[n.id];
      var st = stateOf(n);
      var isAllSel = !!allSelected[n.id];
      var isTopMenu = depth === 1;              /* 一级菜单（在客户端分组下） */

      var cb = null;
      if (checkable) {
        var cls = 'checkbox' + (st === 2 ? ' is-checked' : st === 1 ? ' is-indeterminate' : '');
        cb = h('span', {
          class: cls,
          onclick: function (e) {
            e.stopPropagation();
            /* 一级菜单处于"全选"状态时，由全选按钮控制；子节点在父级全选时不可单独操作 */
            if (isAllSel && isTopMenu) return;
            if (isAllSel && depth > 1) { allSelected = {}; checked = []; }
            toggle(n, st !== 2);
            render();
          }
        }, h('span', { class: 'box' }, st === 2 ? '✓' : ''));
      }

      /* 一级菜单的全选按钮 */
      var allBtn = null;
      if (checkable && isTopMenu && hasChild) {
        allBtn = h('button', {
          class: 'btn-mini' + (isAllSel ? ' is-active' : ''),
          type: 'button',
          title: isAllSel ? '已全选（含后续新增子菜单），点击解除' : '点击全选该一级菜单下所有子菜单（未来新增自动关联）',
          onclick: function (e) {
            e.stopPropagation();
            if (isAllSel) {
              delete allSelected[n.id];
              checked = [];
            } else {
              allSelected[n.id] = true;
              var ids = leafIds(n);
              ids.forEach(function (id) { if (checked.indexOf(id) < 0) checked.push(id); });
              /* 同时把 n 自身的 id 也加入 checked（兼容旧逻辑） */
              if (checked.indexOf(n.id) < 0) checked.push(n.id);
            }
            render();
          }
        }, isAllSel ? '✓ 全选' : '全选');
      }

      var rowCls = 'tree-row' + (selectedId === n.id ? ' is-selected' : '') + (isAllSel ? ' is-all-selected' : '');
      var row = h('div', {
        class: rowCls,
        onclick: function () {
          if (hasChild) { expanded[n.id] = !isOpen; }
          if (opts.onSelect) { selectedId = n.id; opts.onSelect(n); }
          render();
        }
      }, [
        h('span', { class: 'tree-arrow' + (hasChild ? (isOpen ? ' is-open' : '') : ' is-leaf') }, '▶'),
        cb,
        h('span', { class: 'tree-label', text: n.name }),
        n.type ? h('span', { class: 'tag ' + (n.type === '业主' ? 'tag-primary' : 'tag-info'), text: n.type }) : null,
        n.subCount ? h('span', { class: 'tree-badge', text: '下级 ' + n.subCount }) : null,
        n.memberCount !== undefined ? h('span', { class: 'tree-badge', text: n.memberCount + ' 人' }) : null,
        isAllSel ? h('span', { class: 'tag tag-success', text: '全选（含新增）' }) : null,
        allBtn
      ]);

      var box = h('div', {}, [row]);
      if (hasChild && isOpen) {
        var kids = h('div', { class: 'tree-children' });
        n.children.forEach(function (c) { kids.appendChild(renderNode(c, depth + 1)); });
        box.appendChild(kids);
      }
      return box;
    }

    render();

    root.getChecked = function () { return checked.slice(); };
    root.setChecked = function (ids) { checked = (ids || []).slice(); render(); };
    root.getAllSelected = function () { return Object.keys(allSelected); };
    root.setAllSelected = function (ids) { allSelected = {}; (ids || []).forEach(function (id) { allSelected[id] = true; }); render(); };
    root.checkAll = function () { checked = allIds(nodes); render(); };
    root.uncheckAll = function () { checked = []; allSelected = {}; render(); };
    return root;
  }

  /* ---------------- 表格 ---------------- */
  /* opts: {columns:[{title,key,width,render(row,idx),maxChars,ellipsis}], rows, empty, onRowClick}
     普通文本默认超过 20 字省略，title 提供悬停全文；操作列不参与截断。 */
  function table(opts) {
    var cols = opts.columns || [];
    var rows = opts.rows || [];
    var wrap = h('div', { class: 'table-wrap' });
    var tb = h('table', { class: 'table' });

    function clippedText(text, maxChars) {
      var value = String(text === undefined || text === null ? '' : text);
      var limit = maxChars || 20;
      return value.length > limit ? value.slice(0, limit) + '…' : value;
    }

    var thead = h('thead', {}, h('tr', {}, cols.map(function (c) {
      return h('th', { style: c.width ? { width: c.width + 'px' } : null, text: c.title });
    })));
    tb.appendChild(thead);

    var tbody = h('tbody');
    if (!rows.length) {
      tbody.appendChild(h('tr', {}, h('td', { colspan: cols.length },
        h('div', { class: 'table-empty', text: opts.empty || '暂无数据' }))));
    } else {
      rows.forEach(function (row, idx) {
        var tr = h('tr', { onclick: opts.onRowClick ? function () { opts.onRowClick(row, idx); } : null },
          cols.map(function (c) {
            var v;
            var noEllipsis = c.ellipsis === false || c.title === '操作';
            if (c.render) v = c.render(row, idx);
            else v = row[c.key];
            if (v === undefined || v === null) v = '—';
            if (noEllipsis) {
              if (typeof v === 'string' || typeof v === 'number') return h('td', { text: String(v) });
              return h('td', {}, v);
            }
            if (typeof v === 'string' || typeof v === 'number') {
              var full = String(v);
              return h('td', {}, h('div', {
                class: 'table-cell-ellipsis',
                title: full || '—',
                text: clippedText(full, c.maxChars)
              }));
            }
            var cell = h('td', {}, h('div', {
              class: 'table-cell-ellipsis',
              title: v && v.textContent ? String(v.textContent).trim() : ''
            }, v));
            return cell;
          }));
        tbody.appendChild(tr);
      });
    }
    tb.appendChild(tbody);
    wrap.appendChild(tb);
    return wrap;
  }

  /* ---------------- 分页 ---------------- */
  function pagination(opts) {
    var total = opts.total || 0;
    var page = opts.page || 1;
    var size = opts.size || 10;
    var totalPages = Math.max(1, Math.ceil(total / size));

    function go(p) {
      if (p < 1 || p > totalPages || p === page) return;
      if (opts.onChange) opts.onChange(p);
    }

    var pager = h('div', { class: 'pager' }, [
      h('button', { class: 'pager-btn', type: 'button', disabled: page <= 1, onclick: function () { go(page - 1); } }, '‹'),
      h('button', { class: 'pager-btn is-active', type: 'button', text: String(page) }),
      h('button', { class: 'pager-btn', type: 'button', disabled: page >= totalPages, onclick: function () { go(page + 1); } }, '›')
    ]);

    return h('div', { class: 'pagination' }, [
      h('div', { text: '共 ' + total + ' 条' }),
      pager
    ]);
  }

  /* ---------------- 表单字段 ---------------- */
  /* opts: {label, required, tip, control(DOM), error} */
  function field(opts) {
    return h('div', { class: 'field' }, [
      opts.label ? h('label', { class: 'field-label' }, [
        opts.required ? h('span', { class: 'req', text: '*' }) : null,
        opts.label
      ]) : null,
      opts.control,
      opts.tip ? h('div', { class: 'field-tip', text: opts.tip }) : null,
      h('div', { class: 'form-error', text: opts.error || '' })
    ]);
  }

  /* ---------------- 标签 ---------------- */
  function tag(text, type) {
    return h('span', { class: 'tag tag-' + (type || 'default'), text: text });
  }

  /* 状态 → 标签类型映射 */
  function statusTag(status) {
    var map = {
      '通过': 'success', '已驳回': 'danger', '待审批': 'warning',
      '启用': 'success', '停用': 'info',
      '正式': 'success', '试用': 'warning'
    };
    return tag(status, map[status] || 'default');
  }

  /* ---------------- 面包屑 ---------------- */
  function crumb(items) {
    return h('span', { class: 'crumb' }, items.map(function (it, i) {
      var isLast = i === items.length - 1;
      return h('span', {}, [
        h('span', { class: isLast ? 'cur' : '', text: it }),
        isLast ? null : '  /  '
      ]);
    }));
  }

  /* ---------------- 空状态 ---------------- */
  function empty(text) { return h('div', { class: 'empty', text: text || '暂无数据' }); }

  /* ---------------- 表单校验助手 ---------------- */
  function validate(rules, values) {
    var errors = {};
    rules.forEach(function (r) {
      var v = values[r.key];
      if (r.required && (v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && !v.length))) {
        errors[r.key] = r.message || (r.label + '不能为空');
        return;
      }
      if (r.maxLength && typeof v === 'string' && v.length > r.maxLength) {
        errors[r.key] = r.label + '不能超过 ' + r.maxLength + ' 字';
        return;
      }
      if (r.pattern && typeof v === 'string' && !r.pattern.test(v)) {
        errors[r.key] = r.message || (r.label + '格式不正确');
        return;
      }
      if (r.validator) {
        var msg = r.validator(v, values);
        if (msg) errors[r.key] = msg;
      }
    });
    return errors;
  }

  /* 把错误显示到 field 上 */
  function showErrors(container, errors) {
    var fields = container.querySelectorAll('.field');
    Array.prototype.forEach.call(fields, function (f) {
      var err = f.querySelector('.form-error');
      var label = f.querySelector('.field-label');
      var key = f.getAttribute('data-key');
      if (!key) return;
      if (errors[key]) {
        f.classList.add('is-error');
        if (err) err.textContent = errors[key];
      } else {
        f.classList.remove('is-error');
        if (err) err.textContent = '';
      }
    });
  }

  /* ---------------- 复选框列表(弹窗式多选) ---------------- */
  /* opts: {options:[{value,label,sub?,meta?}], value:[], searchable, height, onChange} */
  function checkboxList(opts) {
    var options = (opts.options || []).slice();
    var value = (opts.value || []).slice();
    var searchable = opts.searchable !== false;
    var height = opts.height || '320px';
    var onChange = opts.onChange;

    function match(opt, kw) {
      if (!kw) return true;
      var k = String(kw).trim().toLowerCase();
      if (!k) return true;
      return String(opt.label || '').toLowerCase().indexOf(k) >= 0
        || String(opt.sub || '').toLowerCase().indexOf(k) >= 0
        || String(opt.searchKey || '').toLowerCase().indexOf(k) >= 0;
    }
    function renderList(kw) {
      clear(list);
      var visible = options.filter(function (o) { return match(o, kw); });
      if (!visible.length) { list.appendChild(h('div', { class: 'cb-list-empty', text: '暂无数据' })); return; }
      visible.forEach(function (o) {
        var checked = value.indexOf(o.value) >= 0;
        var row = h('label', { class: 'cb-list-row' + (checked ? ' is-checked' : '') }, [
          h('span', { class: 'cb-list-box' }, checked ? '✓' : ''),
          h('div', { class: 'cb-list-main' }, [
            h('div', { class: 'cb-list-label', text: o.label }),
            o.sub ? h('div', { class: 'cb-list-sub', text: o.sub }) : null,
            o.meta ? h('div', { class: 'cb-list-meta', text: o.meta }) : null
          ])
        ]);
        row.addEventListener('click', function (e) {
          e.preventDefault();
          var i = value.indexOf(o.value);
          if (i >= 0) value.splice(i, 1); else value.push(o.value);
          renderList(search.value);
          refreshCount();
          if (onChange) onChange(value.slice());
        });
        list.appendChild(row);
      });
    }
    function refreshCount() {
      if (count) count.textContent = '已选 ' + value.length + ' / ' + options.length;
    }

    var search = null;
    var header = h('div', { class: 'cb-list-toolbar' }, [
      searchable ? (search = h('input', { type: 'text', class: 'input', placeholder: '搜索姓名/手机号/角色', style: { width: '240px' } })) : null,
      h('button', { class: 'btn btn-text', type: 'button', onclick: function () { value = options.map(function (o) { return o.value; }); renderList(search && search.value); refreshCount(); if (onChange) onChange(value.slice()); } }, '全选'),
      h('button', { class: 'btn btn-text', type: 'button', onclick: function () { value = []; renderList(search && search.value); refreshCount(); if (onChange) onChange(value.slice()); } }, '清空')
    ]);
    if (search) search.addEventListener('input', function () { renderList(search.value); });
    var count = h('span', { class: 'cb-list-count', text: '' });
    header.appendChild(count);

    var list = h('div', { class: 'cb-list', style: { maxHeight: height, overflowY: 'auto' } });
    var root = h('div', { class: 'checkbox-list' }, [header, list]);

    renderList('');
    refreshCount();
    root.getValue = function () { return value.slice(); };
    root.setValue = function (v) { value = (v || []).slice(); renderList(search && search.value); refreshCount(); };
    return root;
  }

  /* ---------------- 左右双栏关联用户 ---------------- */
  /* opts: {options:[{value,label,sub?,meta?}], value:[], height, leftTitle, rightTitle} */
  function transferList(opts) {
    var options = (opts.options || []).slice();
    var selected = (opts.value || []).slice();
    var height = opts.height || '420px';
    var optionMap = {};
    options.forEach(function (o) { optionMap[o.value] = o; });
    var leftKeyword = '';
    var rightKeyword = '';

    function match(opt, keyword) {
      var kw = String(keyword || '').trim().toLowerCase();
      if (!kw) return true;
      return [opt.label, opt.sub, opt.meta, opt.searchKey].some(function (v) {
        return String(v || '').toLowerCase().indexOf(kw) >= 0;
      });
    }

    function renderRows(container, items, side) {
      clear(container);
      if (!items.length) {
        container.appendChild(h('div', {
          class: 'transfer-empty',
          text: side === 'left' ? '暂无可关联用户' : '暂无已关联用户'
        }));
        return;
      }
      items.forEach(function (opt) {
        var row = h('button', { class: 'transfer-row', type: 'button' }, [
          h('div', { class: 'transfer-main' }, [
            h('div', { class: 'transfer-label', text: opt.label }),
            opt.sub ? h('div', { class: 'transfer-sub', text: opt.sub }) : null,
            opt.meta ? h('div', { class: 'transfer-meta', text: opt.meta }) : null
          ]),
          h('span', {
            class: 'transfer-action',
            text: side === 'left' ? '关联 →' : '← 取消关联'
          })
        ]);
        row.addEventListener('click', function () {
          if (side === 'left') {
            if (selected.indexOf(opt.value) < 0) selected.push(opt.value);
          } else {
            selected = selected.filter(function (id) { return id !== opt.value; });
          }
          render();
        });
        container.appendChild(row);
      });
    }

    var leftList = h('div', { class: 'transfer-items', style: { maxHeight: height, overflowY: 'auto' } });
    var rightList = h('div', { class: 'transfer-items', style: { maxHeight: height, overflowY: 'auto' } });
    var leftCount = h('span', { class: 'transfer-count' });
    var rightCount = h('span', { class: 'transfer-count' });
    var leftSearch = h('input', { class: 'transfer-search', type: 'text', placeholder: '搜索姓名 / 手机号 / 角色' });
    var rightSearch = h('input', { class: 'transfer-search', type: 'text', placeholder: '搜索已关联用户' });
    leftSearch.addEventListener('input', function () { leftKeyword = leftSearch.value; render(); });
    rightSearch.addEventListener('input', function () { rightKeyword = rightSearch.value; render(); });

    var grid = h('div', { class: 'transfer-grid' }, [
      h('section', { class: 'transfer-panel' }, [
        h('div', { class: 'transfer-head' }, [
          h('span', { class: 'transfer-title', text: opts.leftTitle || '可关联用户' }),
          leftCount
        ]),
        leftSearch,
        leftList
      ]),
      h('section', { class: 'transfer-panel is-right' }, [
        h('div', { class: 'transfer-head' }, [
          h('span', { class: 'transfer-title', text: opts.rightTitle || '已关联用户' }),
          rightCount
        ]),
        rightSearch,
        rightList
      ])
    ]);

    var root = h('div', { class: 'transfer-list' }, [
      h('div', { class: 'transfer-tip', text: '点击用户即可在左右列表间关联或取消关联。' }),
      grid
    ]);

    function render() {
      var available = options.filter(function (o) { return selected.indexOf(o.value) < 0; });
      var bound = selected.map(function (id) { return optionMap[id]; }).filter(Boolean);
      renderRows(leftList, available.filter(function (o) { return match(o, leftKeyword); }), 'left');
      renderRows(rightList, bound.filter(function (o) { return match(o, rightKeyword); }), 'right');
      leftCount.textContent = available.length + ' 人';
      rightCount.textContent = bound.length + ' 人';
    }

    render();
    root.getValue = function () { return selected.slice(); };
    root.setValue = function (v) { selected = (v || []).slice(); render(); };
    return root;
  }

  return {
    h: h, append: append, clear: clear,
    toast: toast,
    modal: modal,
    confirm: confirm,
    select: select,
    tree: tree,
    table: table,
    pagination: pagination,
    field: field,
    tag: tag,
    statusTag: statusTag,
    crumb: crumb,
    empty: empty,
    checkboxList: checkboxList,
    transferList: transferList,
    validate: validate,
    showErrors: showErrors
  };
})();
