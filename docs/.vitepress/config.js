export default {
  title: "react18源码解析", // 博客的标题
  description: "react相关学习文档", // 博客的介绍
  base: "/react-docs/", // 根路径,如果想用github.io访问这个必填，需和github仓库名字一致 【https://vitejs.cn/vitepress/guide/deploy.html#github-pages-%E5%92%8C-travis-ci】
  lastUpdated: true, // 开启最后更新时间
  themeConfig: {
    logo: "/images/logo.png", // 页面上显示的logo
    algolia: {
      appId: 'W89ZSBPTZN',
      apiKey: '38d78106e5e486959bba0748b3378d84', // 这里是algolia的key和indexName，请自行前往申请
      indexName: 'react-docs',
      placeholder: '请输入关键词',
      buttonText: '搜索',
    },
    nav: [
      // 页面右上角的导航
      { text: "🔥前端算法(编写中)", link: "/blogs/blog1/" },
      { text: "💭学习圈子(编写中)", link: "/blogs/blog1/" },
      {
        text: "其他",
        items: [
          // 可以配置成下拉
          { text: "Changelog", link: "/others/changelog" },
          { text: "Contribution", link: "/others/contribution" },
        ],
      },
    ],
    sidebar: {
      // 侧边栏，可以分组
      // 当用户在 `blogs` 目录页面下将会展示这个侧边栏
      "/blogs/blog1/": [
        {
          text: "如何调试源码",
          items: [
            {
              text: "优雅的调试源码",
              link: "/blogs/blog1/",
            },
            {
              text: "彻底理解react的时间分片和并发机制",
              link: "/blogs/blog1/scheduler_and_concurrent",
            },
            // {
            //   text: "second",
            //   link: "/blogs/blog1/second",
            // },
          ],
        },
      ],
    },
    docFooter: { prev: '上一篇', next: '下一篇' },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2023-present react-docs'
    },
    lastUpdatedText: "最近更新时间",
    // 编辑连接
    editLink: {
      pattern: "https://github.com/xzy0625/react-docs/tree/master/docs/:path", // 这里换成自己的github连接
      text: 'Edit this page on GitHub'
    },
    socialLinks: [{ icon: "github", link: "https://github.com/xzy0625/react-docs" }], // 可以连接到 github
  },
};
