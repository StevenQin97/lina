<template>
  <GenericDetailPage :object.sync="TaskDetail" :active-menu.sync="config.activeMenu" v-bind="config" v-on="$listeners">
    <keep-alive>
      <component :is="config.activeMenu" :object="TaskDetail" />
    </keep-alive>
  </GenericDetailPage>
</template>

<script>
import { GenericDetailPage } from '@/layout/components'
import Detail from './Detail.vue'
export default {
  components: {
    GenericDetailPage,
    Detail
  },
  data() {
    return {
      TaskDetail: {},
      config: {
        activeMenu: 'Detail',
        submenu: [
          {
            title: this.$t('acl.RuleDetail'),
            name: 'Detail'
          }
        ],
        hasRightSide: false,
        actions: {
          detailApiUrl: `/api/v1/acls/login-acls/${this.$route.params.id}/?user=${this.$route.query.user}`,
          deleteApiUrl: `/api/v1/acls/login-acls/${this.$route.params.id}/?user=${this.$route.query.user}`
        }
      }
    }
  }
}
</script>

<style scoped>
</style>
