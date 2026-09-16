/* ===========================================================
   初始 Mock 数据
   口径来源：完整需求文档 §9 示例数据 + 各 PRD 字段规则
   =========================================================== */
window.DG = window.DG || {};

DG.data = (function () {
  /* ---------------- 菜单权限树（PRD-01：按 数字化平台 / Web / APP / 大屏 分组） ---------------- */
  /* 菜单权限树：客户端(一级) → 一级菜单(二级) → 二级操作(三级)。
     一级菜单为"全选"粒度：全选后自动关联其下所有二级操作，未来新增操作自动生效。 */
  var OP = ['add', 'del', 'edit', 'view'];
  function ops(prefix, withView) {
    var list = [
      { id: prefix + '-add', name: '新增' },
      { id: prefix + '-edit', name: '编辑' },
      { id: prefix + '-del', name: '删除' }
    ];
    if (withView) list.push({ id: prefix + '-view', name: '查看' });
    return list;
  }
  var menus = [
    {
      id: 'g-platform', name: '数字化平台', children: [
        { id: 'm-user', name: '用户管理', children: ops('m-user') },
        { id: 'm-role', name: '角色管理', children: ops('m-role') },
        { id: 'm-project', name: '项目管理', children: ops('m-project') },
        { id: 'm-site', name: '工地管理', children: ops('m-site').concat([{ id: 'm-site-approve', name: '审批' }]) },
        { id: 'm-log', name: '操作日志', children: ops('m-log') }
      ]
    },
    {
      id: 'g-web', name: 'Web 端', children: [
        { id: 'm-home', name: '首页', children: ops('m-home', true) },
        { id: 'm-grid', name: '网格管理', children: ops('m-grid', true) },
        { id: 'm-task', name: '任务中心', children: ops('m-task', true) },
        { id: 'm-patrol', name: '巡检管理', children: ops('m-patrol', true) },
        { id: 'm-danger', name: '隐患上报', children: ops('m-danger', true) },
        { id: 'm-report', name: '数据报表', children: ops('m-report', true) },
        { id: 'm-unit', name: '单位管理', children: ops('m-unit', true) }
      ]
    },
    {
      id: 'g-app', name: 'APP 端', children: [
        { id: 'm-app-home', name: '首页', children: ops('m-app-home', true) },
        { id: 'm-app-todo', name: '待办', children: ops('m-app-todo', true) },
        { id: 'm-app-patrol', name: '巡检打卡', children: ops('m-app-patrol', true) },
        { id: 'm-app-msg', name: '消息', children: ops('m-app-msg', true) }
      ]
    },
    {
      id: 'g-screen', name: '管理大屏', children: [
        { id: 'm-sc-proj', name: '项目总览', children: ops('m-sc-proj', true) },
        { id: 'm-sc-site', name: '工地总览', children: ops('m-sc-site', true) }
      ]
    }
  ];

  /* ---------------- 项目（PRD-03） ---------------- */
  var projects = [
    {
      id: 'p1', code: 'XM20260826001', name: '邛芦荥高速', similarName: '邛芦荥',
      siteIds: ['s1', 's2'], locateFreq: '5分钟', status: '通过',
      menuIds: ['m-home', 'm-grid', 'm-task', 'm-patrol', 'm-danger'],
      copyFrom: '', applyOpinion: '同意开工，按标准配置网格。', remark: '省级重点高速项目',
      creator: '王宇', createTime: '2026-08-26 09:12',
      approveRecords: [
        { time: '2026-08-26 09:12', action: '提交申请', user: '王宇' },
        { time: '2026-08-26 15:40', action: '审批通过', user: '李审查', opinion: '同意开工，按标准配置网格。' }
      ]
    },
    {
      id: 'p2', code: 'XM20260828002', name: '成都第二绕城高速改扩建', similarName: '二绕',
      siteIds: ['s3'], locateFreq: '10分钟', status: '待审批',
      menuIds: ['m-home', 'm-grid', 'm-report'],
      copyFrom: 'p1', applyOpinion: '沿用邛芦荥高速菜单配置，申请开通。', remark: '',
      creator: '王宇', createTime: '2026-08-28 10:05',
      approveRecords: [
        { time: '2026-08-28 10:05', action: '提交申请', user: '王宇' }
      ]
    },
    {
      id: 'p3', code: 'XM20260830003', name: '西昌至香格里拉高速公路', similarName: '西香高速',
      siteIds: [], locateFreq: '5分钟', status: '已驳回',
      menuIds: ['m-home'], copyFrom: '',
      applyOpinion: '先补充标段划分与网格方案后再提交。', remark: '',
      creator: '王宇', createTime: '2026-08-30 14:20',
      approveRecords: [
        { time: '2026-08-30 14:20', action: '提交申请', user: '王宇' },
        { time: '2026-08-31 09:00', action: '驳回', user: '李审查', opinion: '先补充标段划分与网格方案后再提交。' }
      ]
    },
    {
      id: 'p4', code: 'XM20260901004', name: '天府机场高速南线', similarName: '机场南线',
      siteIds: [], locateFreq: '10分钟', status: '通过',
      menuIds: ['m-home', 'm-grid', 'm-task'], copyFrom: '',
      applyOpinion: '同意。', remark: '', creator: '王宇', createTime: '2026-09-01 08:30',
      approveRecords: [
        { time: '2026-09-01 08:30', action: '提交申请', user: '王宇' },
        { time: '2026-09-01 11:12', action: '审批通过', user: '李审查', opinion: '同意。' }
      ]
    }
  ];

  /* ---------------- 工地（PRD-03） ---------------- */
  var sites = [
    {
      id: 's1', code: 'GD20260826001', name: 'TJ1标段-起点段', similarName: 'TJ1',
      projectId: 'p1', projectName: '邛芦荥高速',
      approveStatus: '通过', siteStatus: '正式', trialEnd: '',
      lng: '103.4521', lat: '30.4128', locateFreq: '5分钟',
      menuIds: ['m-home', 'm-grid', 'm-task'], copyFrom: '',
      applyOpinion: '标段起点，同意开通。', remark: '',
      creator: '王宇', createTime: '2026-08-26 10:00',
      approveRecords: [
        { time: '2026-08-26 10:00', action: '提交申请', user: '王宇' },
        { time: '2026-08-26 16:20', action: '审批通过', user: '李审查', opinion: '标段起点，同意开通。' }
      ]
    },
    {
      id: 's2', code: 'GD20260827002', name: 'TJ2标段-隧道段', similarName: 'TJ2',
      projectId: 'p1', projectName: '邛芦荥高速',
      approveStatus: '通过', siteStatus: '试用', trialEnd: '2026-12-31',
      lng: '103.5012', lat: '30.3987', locateFreq: '5分钟',
      menuIds: ['m-home', 'm-grid', 'm-patrol', 'm-danger'], copyFrom: 's1',
      applyOpinion: '试用期至 2026-12-31，到期评估。', remark: '隧道施工风险较高',
      creator: '王宇', createTime: '2026-08-27 09:30',
      approveRecords: [
        { time: '2026-08-27 09:30', action: '提交申请', user: '王宇' },
        { time: '2026-08-27 14:05', action: '审批通过', user: '李审查', opinion: '试用期至 2026-12-31，到期评估。' }
      ]
    },
    {
      id: 's3', code: 'GD20260829003', name: 'TJ3标段-桥梁段', similarName: 'TJ3',
      projectId: 'p2', projectName: '成都第二绕城高速改扩建',
      approveStatus: '待审批', siteStatus: '正式', trialEnd: '',
      lng: '104.0612', lat: '30.5721', locateFreq: '10分钟',
      menuIds: ['m-home', 'm-grid'], copyFrom: '',
      applyOpinion: '桥梁段，申请开通试用。', remark: '',
      creator: '王宇', createTime: '2026-08-29 11:15',
      approveRecords: [
        { time: '2026-08-29 11:15', action: '提交申请', user: '王宇' }
      ]
    },
    {
      id: 's4', code: 'GD20260830004', name: 'TJ4标段-路面段', similarName: 'TJ4',
      projectId: 'p1', projectName: '邛芦荥高速',
      approveStatus: '已驳回', siteStatus: '正式', trialEnd: '',
      lng: '103.4789', lat: '30.4210', locateFreq: '5分钟',
      menuIds: ['m-home'], copyFrom: '',
      applyOpinion: '与 TJ1 标段范围重叠，请核实后重新提交。', remark: '',
      creator: '王宇', createTime: '2026-08-30 15:40',
      approveRecords: [
        { time: '2026-08-30 15:40', action: '提交申请', user: '王宇' },
        { time: '2026-08-31 10:00', action: '驳回', user: '李审查', opinion: '与 TJ1 标段范围重叠，请核实后重新提交。' }
      ]
    },
    {
      id: 's5', code: 'GD20260901005', name: '机场南线先导段', similarName: '先导段',
      projectId: 'p4', projectName: '天府机场高速南线',
      approveStatus: '通过', siteStatus: '试用', trialEnd: '2026-11-30',
      lng: '104.1234', lat: '30.3012', locateFreq: '10分钟',
      menuIds: ['m-home', 'm-grid', 'm-task'], copyFrom: 's1',
      applyOpinion: '同意先导段开通。', remark: '',
      creator: '王宇', createTime: '2026-09-01 09:00',
      approveRecords: [
        { time: '2026-09-01 09:00', action: '提交申请', user: '王宇' },
        { time: '2026-09-01 10:30', action: '审批通过', user: '李审查', opinion: '同意先导段开通。' }
      ]
    },
    {
      id: 's6', code: 'GD20260902006', name: '临时试点工地', similarName: '试点',
      projectId: '', projectName: '',
      approveStatus: '通过', siteStatus: '正式', trialEnd: '',
      lng: '104.2345', lat: '30.2345', locateFreq: '15分钟',
      menuIds: ['m-home', 'm-grid'], copyFrom: '',
      applyOpinion: '独立工地，试点数字化应用。', remark: '无所属项目',
      creator: '王宇', createTime: '2026-09-02 10:00',
      approveRecords: [
        { time: '2026-09-02 10:00', action: '提交申请', user: '王宇' },
        { time: '2026-09-02 14:30', action: '审批通过', user: '李审查', opinion: '独立工地，试点数字化应用。' }
      ]
    }
  ];

  /* ---------------- 单位（PRD-04，项目端，树形） ---------------- */
  var units = [
    {
      id: 'u1', name: '四川蜀道业主单位', type: '业主', parentId: null,
      projectId: 'p1', siteId: '', memberCount: 5, status: '启用',
      remark: '项目业主主体', createTime: '2026-08-26 09:20'
    },
    {
      id: 'u2', name: 'XX监理一标', type: '监理', parentId: null,
      projectId: 'p1', siteId: 's1', memberCount: 3, status: '启用',
      remark: 'TJ1 标段监理', createTime: '2026-08-26 10:10'
    },
    {
      id: 'u3', name: 'XX监理二标', type: '监理', parentId: 'u2',
      projectId: 'p1', siteId: 's2', memberCount: 2, status: '启用',
      remark: 'TJ2 标段监理（下级单位）', createTime: '2026-08-27 09:40'
    },
    {
      id: 'u4', name: '二绕业主代表处', type: '业主', parentId: null,
      projectId: 'p2', siteId: '', memberCount: 2, status: '停用',
      remark: '项目待审批，单位暂未启用', createTime: '2026-08-28 10:20'
    },
    {
      id: 'u5', name: '机场南线监理单位', type: '监理', parentId: null,
      projectId: 'p4', siteId: 's5', memberCount: 4, status: '启用',
      remark: '', createTime: '2026-09-01 09:10'
    }
  ];

  /* ---------------- 角色（PRD-01，四类） ---------------- */
  var roles = [
    /* JDS 内部角色 */
    { id: 'r1', name: '系统管理员', type: '内部', builtin: true, platform: 'jds', client: '数字化平台', userIds: ['U001'], userCount: 1, updateTime: '2026-08-20 10:00', menuIds: ['m-user', 'm-role', 'm-project', 'm-site', 'm-site-approve', 'm-log'], canEdit: true, canDelete: false },
    { id: 'r2', name: '项目审查员', type: '内部', builtin: false, platform: 'jds', client: '数字化平台', userIds: ['U002', 'U005'], userCount: 2, updateTime: '2026-08-25 14:20', menuIds: ['m-project', 'm-site', 'm-site-approve'], canEdit: true, canDelete: true },
    { id: 'r3', name: '运营专员', type: '内部', builtin: false, platform: 'jds', client: '数字化平台', userIds: ['U003', 'U004'], userCount: 2, updateTime: '2026-08-28 09:15', menuIds: ['m-home', 'm-report'], canEdit: true, canDelete: true },

    /* 项目端角色 */
    { id: 'r4', name: '网格长', type: '默认', builtin: true, platform: 'project', client: 'Web/APP', userIds: ['U102'], userCount: 1, updateTime: '2026-08-26 09:30', menuIds: ['m-home', 'm-grid', 'm-task', 'm-app-home', 'm-app-todo'], synced: true, canEdit: true, canDelete: false, unitName: '四川蜀道业主单位' },
    { id: 'r5', name: '现场网格员', type: '默认', builtin: true, platform: 'project', client: 'Web/APP', userIds: ['U103'], userCount: 1, updateTime: '2026-08-26 09:30', menuIds: ['m-home', 'm-grid', 'm-patrol', 'm-app-patrol'], synced: true, canEdit: true, canDelete: false },
    { id: 'r6', name: '资料管理员', type: '自定义', builtin: false, platform: 'project', client: 'Web', userIds: ['U104'], userCount: 1, updateTime: '2026-08-29 16:40', menuIds: ['m-task', 'm-report'], synced: false, canEdit: true, canDelete: true, unitName: 'XX监理一标' },
    { id: 'r7', name: '安全巡查员', type: '自定义', builtin: false, platform: 'project', client: 'Web/APP', userIds: ['U105'], userCount: 1, updateTime: '2026-08-30 11:00', menuIds: ['m-patrol', 'm-danger', 'm-app-patrol'], synced: false, canEdit: true, canDelete: true, unitName: '四川蜀道业主单位' },
    { id: 'r8', name: '项目管理员', type: '管理员', builtin: true, platform: 'project', client: 'Web/APP', userIds: ['U101'], userCount: 1, updateTime: '2026-08-26 09:25', menuIds: ['m-home', 'm-grid', 'm-task', 'm-patrol', 'm-danger', 'm-report', 'm-app-home'], canEdit: false, canDelete: false },

    /* 工地端角色 */
    { id: 'r9', name: '工地管理员', type: '管理员', builtin: true, platform: 'site', client: 'Web/APP', alias: '工地负责人', userIds: ['U201'], userCount: 1, updateTime: '2026-08-26 10:05', menuIds: ['m-home', 'm-grid', 'm-task', 'm-app-home', 'm-app-todo'], canEdit: false, canDelete: false, source: '内置' },
    { id: 'r10', name: '网格长', type: '默认', builtin: true, platform: 'site', client: 'Web/APP', alias: '标段网格长', userIds: ['U202'], userCount: 1, updateTime: '2026-08-27 09:00', menuIds: ['m-home', 'm-grid', 'm-task', 'm-app-todo'], canEdit: true, canDelete: false, source: '项目同步' },
    { id: 'r11', name: '现场网格员', type: '默认', builtin: true, platform: 'site', client: 'Web/APP', alias: '', userIds: ['U203'], userCount: 1, updateTime: '2026-08-27 09:00', menuIds: ['m-home', 'm-grid', 'm-app-patrol'], canEdit: true, canDelete: false, source: '项目同步' },
    { id: 'r12', name: '班组安全员', type: '自定义', builtin: false, platform: 'site', client: 'APP', alias: '安全员', userIds: ['U203'], userCount: 1, updateTime: '2026-08-31 15:20', menuIds: ['m-danger', 'm-app-patrol'], canEdit: true, canDelete: true, source: '工地自定义' }
  ];

  /* ---------------- 用户（PRD-02） ---------------- */
  var users = [
    /* JDS 用户 */
    { id: 'U001', code: 'U001', name: '王宇', alias: '', phone: '13800001111', gender: '男', roleNames: ['系统管理员'], platform: 'jds', unitName: '', projectId: '', siteId: '', projectSite: '邛芦荥高速/TJ1标段-起点段', grid: '', idCard: '', createTime: '2026-08-01 09:00', userType: 1 },
    { id: 'U002', code: 'U002', name: '李审查', alias: '', phone: '13800001112', gender: '男', roleNames: ['项目审查员'], platform: 'jds', unitName: '', projectId: 'p1', siteId: '', projectSite: '邛芦荥高速', grid: '', idCard: '', createTime: '2026-08-02 10:20', userType: 1 },
    { id: 'U003', code: 'U003', name: '陈运营', alias: '', phone: '13800001113', gender: '女', roleNames: ['运营专员'], platform: 'jds', unitName: '', projectId: 'p1', siteId: 's1', projectSite: '邛芦荥高速/TJ1标段-起点段', grid: '', idCard: '', createTime: '2026-08-03 14:00', userType: 1 },
    { id: 'U004', code: 'U004', name: '赵数据', alias: '', phone: '13800001114', gender: '男', roleNames: ['运营专员'], platform: 'jds', unitName: '', projectId: 'p2', siteId: '', projectSite: '成都第二绕城高速改扩建', grid: '', idCard: '', createTime: '2026-08-05 09:30', userType: 1 },
    { id: 'U005', code: 'U005', name: '孙维护', alias: '', phone: '13800001115', gender: '女', roleNames: ['项目审查员'], platform: 'jds', unitName: '', projectId: 'p4', siteId: 's5', projectSite: '天府机场高速南线/机场南线先导段', grid: '', idCard: '', createTime: '2026-08-08 16:10', userType: 1 },

    /* 项目端用户（单位=业主/监理） */
    { id: 'U101', code: 'U101', name: '王建国', alias: '', phone: '13800002222', gender: '男', roleNames: ['项目管理员'], platform: 'project', unitName: '四川蜀道业主单位', projectId: 'p1', siteId: '', projectSite: '邛芦荥高速', grid: '一级网格', idCard: '5101**********1234', createTime: '2026-08-26 09:40', userType: 2 },
    { id: 'U102', code: 'U102', name: '刘监理', alias: '刘工', phone: '13800002223', gender: '男', roleNames: ['网格长'], platform: 'project', unitName: 'XX监理一标', projectId: 'p1', siteId: 's1', projectSite: '邛芦荥高速/TJ1标段-起点段', grid: 'TJ1-01', idCard: '5101**********2233', createTime: '2026-08-26 10:30', userType: 2 },
    { id: 'U103', code: 'U103', name: '张伟', alias: '', phone: '13800002224', gender: '男', roleNames: ['现场网格员'], platform: 'project', unitName: '四川蜀道业主单位', projectId: 'p1', siteId: 's1', projectSite: '邛芦荥高速/TJ1标段-起点段', grid: 'TJ1-02', idCard: '', createTime: '2026-08-27 08:50', userType: 2 },
    { id: 'U104', code: 'U104', name: '李静', alias: '小林', phone: '13800002225', gender: '女', roleNames: ['资料管理员'], platform: 'project', unitName: 'XX监理二标', projectId: 'p1', siteId: 's2', projectSite: '邛芦荥高速/TJ2标段-隧道段', grid: 'TJ2-01', idCard: '', createTime: '2026-08-27 15:20', userType: 2 },
    { id: 'U105', code: 'U105', name: '周安全', alias: '', phone: '13800002226', gender: '男', roleNames: ['安全巡查员'], platform: 'project', unitName: '四川蜀道业主单位', projectId: 'p1', siteId: '', projectSite: '邛芦荥高速', grid: '一级网格', idCard: '', createTime: '2026-08-28 11:00', userType: 2 },
    { id: 'U106', code: 'U106', name: '吴敏', alias: '', phone: '13800002227', gender: '女', roleNames: ['网格长'], platform: 'project', unitName: '二绕业主代表处', projectId: 'p2', siteId: '', projectSite: '成都第二绕城高速改扩建', grid: '', idCard: '', createTime: '2026-08-29 09:40', userType: 2 },

    /* 工地端用户（单位=所属工地） */
    { id: 'U201', code: 'U201', name: '张大力', alias: '', phone: '13800003333', gender: '男', roleNames: ['工地管理员'], platform: 'site', unitName: 'TJ1标段-起点段', projectId: 'p1', siteId: 's1', projectSite: 'TJ1标段-起点段', grid: 'TJ1-01', idCard: '', createTime: '2026-08-26 10:05', userType: 3 },
    { id: 'U202', code: 'U202', name: '杨施工', alias: '老杨', phone: '13800003334', gender: '男', roleNames: ['网格长'], platform: 'site', unitName: 'TJ1标段-起点段', projectId: 'p1', siteId: 's1', projectSite: 'TJ1标段-起点段', grid: 'TJ1-02', idCard: '', createTime: '2026-08-27 08:20', userType: 3 },
    { id: 'U203', code: 'U203', name: '赵巡检', alias: '', phone: '13800003335', gender: '女', roleNames: ['现场网格员'], platform: 'site', unitName: 'TJ1标段-起点段', projectId: 'p1', siteId: 's1', projectSite: 'TJ1标段-起点段', grid: 'TJ1-03', idCard: '', createTime: '2026-08-27 17:30', userType: 3 },
    { id: 'U204', code: 'U204', name: '孙安全', alias: '', phone: '13800003336', gender: '男', roleNames: ['班组安全员'], platform: 'site', unitName: 'TJ2标段-隧道段', projectId: 'p1', siteId: 's2', projectSite: 'TJ2标段-隧道段', grid: 'TJ2-01', idCard: '', createTime: '2026-08-31 15:25', userType: 3 }
  ];

  /* ---------------- 登录演示账号 ---------------- */
  var accounts = [
    { phone: '13800001111', password: '123456', userId: 'U001', desc: 'JDS 用户 · 王宇（同时关联项目与工地）' },
    { phone: '13800002222', password: '123456', userId: 'U101', desc: '项目用户 · 王建国（项目经理）' },
    { phone: '13800003333', password: '123456', userId: 'U201', desc: '工地用户 · 张大力（工地管理员）' }
  ];

  return {
    menus: menus,
    projects: projects,
    sites: sites,
    units: units,
    roles: roles,
    users: users,
    accounts: accounts,
    /* 枚举 */
    enums: {
      locateFreq: ['1分钟', '5分钟', '10分钟', '30分钟'],
      siteStatus: ['正式', '试用'],
      approveStatus: ['待审批', '通过', '已驳回'],
      unitType: ['业主', '监理'],
      roleType: ['内部', '管理员', '默认', '自定义'],
      client: ['数字化平台', 'Web', 'APP', '大屏', 'Web/APP'],
      gender: ['男', '女'],
      yesNo: ['启用', '停用']
    }
  };
})();
