// 只放已确认且准备公开的内容。未提供的信息保存在 docs/content-backlog.json。
// 「已学习」不代表熟练掌握、项目成果或商业交付经验。
export const content = {
  name: '何选',
  englishName: 'HE XUAN',
  role: 'AI 产品经理',
  target: 'AI 产品岗位',
  loaderIntro: '关注 AI 在真实场景中的应用。',
  intro: '我关注 AI 在真实场景中的应用，学习过智能体、知识库、工作流和产品工具相关内容。',
  heroNote: '接下来，我会通过项目记录自己的问题分析、方案选择与实践过程。',
  learning: [
    {
      id: 'knowledge',
      title: 'AI 方法与知识库',
      english: 'METHODS & KNOWLEDGE',
      preview: ['Prompt Engineering', 'RAG', '向量检索'],
      tools: ['Prompt Engineering', 'RAG', 'OCR', '向量检索', 'LLM-as-Judge', 'Agent Harness / Eval'],
    },
    {
      id: 'agents',
      title: '智能体与应用搭建',
      english: 'AGENTS & APPLICATIONS',
      preview: ['Coze', 'Dify', 'n8n'],
      tools: ['OpenClaw', 'Hermes Agent', 'Skill', 'MCP', 'Coze', 'Dify', 'n8n', 'Vibe Coding', 'Cursor', 'Claude Code'],
    },
    {
      id: 'product',
      title: '产品与内容工具',
      english: 'PRODUCT & CONTENT',
      preview: ['Figma', '飞书多维表格', 'NotebookLM'],
      tools: ['Figma', '飞书多维表格', 'NotebookLM', 'Remotion'],
    },
  ],
  projectPreview: {
    title: '项目实践即将更新',
    description: '接下来，我会在这里记录从问题分析、方案选择，到验证与复盘的实践过程。',
  },
  about: {
    heading: ['从学习出发，', '走向真实问题。'],
    paragraphs: [
      '我是何选，正在寻找 AI 产品岗位的机会。我关注 AI 在真实场景中的应用，也希望把学到的知识带进具体的问题里。',
      '目前，这里以学习内容为主。接下来，我会通过项目，记录自己的分析、选择与实践。',
    ],
    education: '大专',
    publicAccount: 'wren的回响',
  },
  contact: {
    email: '2925173595@qq.com',
    phone: '15087517760',
    note: '如果你有 AI 产品岗位机会，欢迎通过邮件或电话与我联系。',
  },
};
