import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "TencentVersion",
  description: "TencentVersion",
  lang: "zh-Hans",
  base: '/TencentVersion/',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/HdShare/TencentVersion' }
    ],
    footer: {
      copyright: "版权所有 © 2024-2025 <a href='https://github.com/HdShare'>HdShare</a>"
    },
  }
})
