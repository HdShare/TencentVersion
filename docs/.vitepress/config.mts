import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "QQVersion",
  description: "QQVersion",
  lang: "zh-Hans",
  base: '/QQVersion/',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/HdShare/QQVersion' }
    ]
  }
})
