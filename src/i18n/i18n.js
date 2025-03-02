// i18n.js
import Vue from 'vue'
import locale from 'element-ui/lib/locale'
import VueI18n from 'vue-i18n'
import messages from './langs'
import date from './date'
import VueCookie from 'vue-cookie'

Vue.use(VueI18n)
const i18n = new VueI18n({
  locale: (VueCookie.get('django_language') || 'zh-hans') === 'zh-hans' ? 'cn' : VueCookie.get('django_language'),
  fallbackLocale: 'en',
  silentFallbackWarn: true,
  silentTranslationWarn: true,
  dateTimeFormats: date,
  messages
})
locale.i18n((key, value) => i18n.t(key, value)) // 重点: 为了实现element插件的多语言切换

Vue.prototype.$tr = (key) => {
  return i18n.t('route.' + key)
}

export default i18n
