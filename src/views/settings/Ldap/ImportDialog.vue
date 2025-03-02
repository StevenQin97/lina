<template>
  <div>
    <Dialog
      :title="$t('setting.importLdapUserTitle')"
      v-bind="$attrs"
      :destroy-on-close="true"
      :show-cancel="false"
      v-on="$listeners"
    >
      <el-alert type="success"> {{ $t('setting.importLdapUserTip') }}</el-alert>
      <ListTable
        ref="listTable"
        class="listTable"
        :table-config="tableConfig"
        :header-actions="headerActions"
        @error="handlerListTableXHRError($event)"
      />
      <div slot="footer">
        <el-button @click="hiddenDialog">{{ $t('common.Cancel') }}</el-button>
        <el-button type="primary" :loading="dialogLdapUserImportLoginStatus" @click="importUserClick">{{ $t('common.Import') }}</el-button>
      </div>
    </Dialog>
    <Dialog
      :title="$t('setting.SyncSetting')"
      :visible.sync="settings.visible"
      :destroy-on-close="true"
      :show-cancel="false"
      :show-confirm="false"
      width="50%"
      top="10%"
    >
      <GenericCreateUpdateForm
        v-bind="settings"
        :has-detail-in-msg="false"
      />
    </Dialog>
  </div>
</template>

<script>
import ListTable from '@/components/ListTable'
import { GenericCreateUpdateForm } from '@/layout/components'
import Dialog from '@/components/Dialog'
import { importLdapUser, refreshLdapUserCache, startLdapUserCache } from '@/api/settings'
import { CronTab } from '@/components'

export default {
  name: 'ImportDialog',
  components: {
    ListTable,
    Dialog,
    GenericCreateUpdateForm
  },
  data() {
    return {
      dialogLdapUserImportLoginStatus: false,
      refreshed: false,
      headerActions: {
        hasCreate: false,
        hasBulkDelete: false,
        hasUpload: false,
        hasExport: false,
        hasImport: false,
        hasUpdate: false,
        handleRefreshClick: async({ reloadTable }) => {
          if (!this.refreshed) {
            await refreshLdapUserCache()
            await startLdapUserCache()
            this.refreshed = true
          }
          reloadTable()
        },
        extraActions: [
          {
            name: 'setting',
            title: this.$t('setting.SyncSetting'),
            type: 'primary',
            callback: function() {
              this.settings.visible = true
            }.bind(this)
          }
        ]
      },
      tableConfig: {
        url: '/api/v1/settings/ldap/users/',
        columns: ['username', 'name', 'email', 'existing'],
        columnsMeta: {
          username: {
            label: this.$t('users.Username'),
            width: '180px'
          },
          name: {
            label: this.$t('users.Name'),
            width: '180px'
          },
          email: {
            label: this.$t('users.Email')
          },
          existing: {
            label: this.$t('users.Existing'),
            width: '120px'
          }
        }
      },
      settings: {
        visible: false,
        url: '/api/v1/settings/setting/?category=ldap',
        fields: ['AUTH_LDAP_SYNC_IS_PERIODIC', 'AUTH_LDAP_SYNC_CRONTAB', 'AUTH_LDAP_SYNC_INTERVAL'],
        fieldsMeta: {
          AUTH_LDAP_SYNC_IS_PERIODIC: {
            type: 'switch'
          },
          AUTH_LDAP_SYNC_CRONTAB: {
            component: CronTab,
            helpText: this.$t('xpack.HelpText.CrontabOfCreateUpdatePage')
          },
          AUTH_LDAP_SYNC_INTERVAL: {
            helpText: this.$t('xpack.HelpText.IntervalOfCreateUpdatePage')
          }
        },
        submitMethod: () => 'patch'
      }
    }
  },
  methods: {
    importUserClick() {
      this.dialogLdapUserImportLoginStatus = true
      const selectIds = []
      this.$refs.listTable.selectedRows.forEach((item, index) => {
        selectIds.push(item.id)
      })
      const data = {
        username_list: selectIds
      }
      if (selectIds.length === 0) {
        this.$message.error(this.$t('setting.unselectedUser'))
        this.dialogLdapUserImportLoginStatus = false
      } else {
        importLdapUser(data).then(res => {
          this.$message.success(res.msg)
          // eslint-disable-next-line no-return-assign
        }).finally(() => this.dialogLdapUserImportLoginStatus = false)
      }
    },
    handlerListTableXHRError(errMsg) {
      if (this.dialogLdapUserImport) {
        setTimeout(this.$refs.listTable.reloadTable, 30000)
      }
    },
    hiddenDialog() {
      this.$emit('update:visible', false)
    }
  }
}
</script>

<style scoped>

</style>
