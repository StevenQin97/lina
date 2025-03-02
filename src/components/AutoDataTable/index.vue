<template>
  <div>
    <DataTable
      v-if="!loading"
      ref="dataTable"
      v-loading="loading"
      :config="iConfig"
      v-bind="$attrs"
      v-on="$listeners"
      @filter-change="filterChange"
    />
    <ColumnSettingPopover
      :current-columns="popoverColumns.currentCols"
      :total-columns-list="popoverColumns.totalColumnsList"
      :min-columns="popoverColumns.minCols"
      :url="config.url"
      @columnsUpdate="handlePopoverColumnsChange"
    />
  </div>
</template>

<script type="text/jsx">
import DataTable from '../DataTable'
import {
  DateFormatter,
  DetailFormatter,
  DisplayFormatter,
  ActionsFormatter,
  ChoicesFormatter
} from '@/components/TableFormatters'
import i18n from '@/i18n/i18n'
import ColumnSettingPopover from './components/ColumnSettingPopover'
import { newURL } from '@/utils/common'
export default {
  name: 'AutoDataTable',
  components: {
    DataTable,
    ColumnSettingPopover
  },
  props: {
    config: {
      type: Object,
      default: () => ({})
    },
    filterTable: {
      type: Function,
      default: () => ({})
    }
  },
  data() {
    return {
      loading: true,
      method: 'get',
      autoConfig: {},
      iConfig: {},
      meta: {},
      cleanedColumnsShow: {},
      totalColumns: [],
      popoverColumns: {
        totalColumnsList: [],
        minCols: [],
        currentCols: []
      }
    }
  },
  computed: {
  },
  watch: {
    config: {
      handler(iNew) {
        this.optionUrlMetaAndGenCols()
        this.$log.debug('AutoDataTable Config change found')
      },
      deep: true
    }
  },
  created() {
    this.optionUrlMetaAndGenCols()
  },
  methods: {
    async optionUrlMetaAndGenCols() {
      if (this.config.url === '') { return }
      const url = (this.config.url.indexOf('?') === -1) ? `${this.config.url}?draw=1&display=1` : `${this.config.url}&draw=1&display=1`
      this.$store.dispatch('common/getUrlMeta', { url: url }).then(data => {
        const method = this.method.toUpperCase()
        this.meta = data.actions && data.actions[method] ? data.actions[method] : {}
        this.generateTotalColumns()
      }).then(() => {
        //  根据当前列重新生成最终渲染表格
        this.filterShowColumns()
      }).then(() => {
        // 生成给子组件使用的TotalColList
        this.generatePopoverColumns()
      }).catch((error) => {
        this.$log.error('Error occur: ', error)
      }).finally(() => {
        this.loading = false
      })
    },
    generateColumnByName(name, col) {
      switch (name) {
        case 'name':
          col.formatter = DetailFormatter
          col.sortable = 'custom'
          col.showOverflowTooltip = true
          break
        case 'actions':
          col = {
            prop: 'actions',
            label: i18n.t('common.Actions'),
            align: 'center',
            width: '150px',
            formatter: ActionsFormatter,
            formatterArgs: {}
          }
          break
        case 'is_valid':
          col.label = i18n.t('common.Validity')
          col.formatter = ChoicesFormatter
          col.align = 'center'
          col.width = '80px'
          break
        case 'datetime':
        case 'date_start':
          col.formatter = DateFormatter
          break
        case 'comment':
          col.showOverflowTooltip = true
      }
      return col
    },
    generateColumnByType(type, col) {
      switch (type) {
        case 'choice':
          col.sortable = 'custom'
          col.formatter = DisplayFormatter
          break
        case 'boolean':
          col.formatter = ChoicesFormatter
          col.align = 'center'
          col.width = '80px'
          break
        case 'datetime':
          col.formatter = DateFormatter
          col.width = '160px'
      }
      return col
    },
    addHelpTipsIfNeed(col) {
      const helpTips = col.helpTips
      if (!helpTips) {
        return col
      }
      col.renderHeader = (h, { column, $index }) => {
        return (
          <span>{column.label}
            <el-tooltip placement='bottom' effect='light' popperClass='help-tips'>
              <div slot='content' domPropsInnerHTML={helpTips} />
              <el-button style='padding: 0'>
                <i class='fa fa-info-circle' />
              </el-button>
            </el-tooltip>
          </span>
        )
      }
      return col
    },
    addFilterIfNeed(col) {
      if (col.prop) {
        const column = this.meta[col.prop] || {}
        if (!column.filter) {
          return col
        }
        if (column.type === 'boolean') {
          col.filters = [
            { text: i18n.t('common.Yes'), value: true },
            { text: i18n.t('common.No'), value: false }
          ]
          col.sortable = false
          col['column-key'] = col.prop
        }
        if (column.type === 'choice' && column.choices) {
          col.filters = column.choices.map(item => {
            if (typeof (item.value) === 'boolean') {
              if (item.value) {
                return { text: item['display_name'], value: 'True' }
              } else {
                return { text: item['display_name'], value: 'False' }
              }
            }
            return { text: item['display_name'], value: item.value }
          })
          col.sortable = false
          col['column-key'] = col.prop
        }
      }
      return col
    },
    generateColumn(name) {
      const colMeta = this.meta[name] || {}
      const customMeta = this.config.columnsMeta ? this.config.columnsMeta[name] : {}
      let col = { prop: name, label: colMeta.label }

      col = this.generateColumnByName(name, col)
      col = this.generateColumnByType(colMeta.type, col)
      col = Object.assign(col, customMeta)
      col = this.addHelpTipsIfNeed(col)
      col = this.addFilterIfNeed(col)
      return col
    },
    generateTotalColumns() {
      const config = _.cloneDeep(this.config)
      let columns = []
      for (let col of config.columns) {
        if (typeof col === 'object') {
          columns.push(col)
        } else if (typeof col === 'string') {
          col = this.generateColumn(col)
          columns.push(col)
        }
      }
      columns = columns.filter(item => {
        let has = item.has
        if (has === undefined) {
          has = true
        } else if (typeof has === 'function') {
          has = has()
        }
        return has
      })
      // 第一次初始化时记录 totalColumns
      this.totalColumns = columns
      config.columns = columns
      this.iConfig = config
    },
    // 生成给子组件使用的TotalColList
    cleanColumnsShow() {
      const totalColumnsNames = this.totalColumns.map(obj => obj.prop)
      // 默认列
      let defaultColumnsNames = _.get(this.iConfig, 'columnsShow.default', [])
      if (defaultColumnsNames.length === 0) {
        defaultColumnsNames = totalColumnsNames
      }
      // Clean it
      defaultColumnsNames = totalColumnsNames.filter(n => defaultColumnsNames.indexOf(n) > -1)

      // 最小列
      const minColumnsNames = _.get(this.iConfig, 'columnsShow.min', ['actions', 'id'])
        .filter(n => defaultColumnsNames.indexOf(n) > -1)

      // 应该显示的列
      const _tableConfig = localStorage.getItem('tableConfig')
        ? JSON.parse(localStorage.getItem('tableConfig'))
        : {}
      const tableName = this.config.name || this.$route.name + '_' + newURL(this.iConfig.url).pathname
      const configShowColumnsNames = _.get(_tableConfig[tableName], 'showColumns', null)
      let showColumnsNames = configShowColumnsNames || defaultColumnsNames
      if (showColumnsNames.length === 0) {
        showColumnsNames = totalColumnsNames
      }
      // 校对显示的列，是不是包含最小列
      minColumnsNames.forEach((v, i) => {
        if (showColumnsNames.indexOf(v) === -1) {
          showColumnsNames.push(v)
        }
      })
      // Clean it
      showColumnsNames = totalColumnsNames.filter(n => showColumnsNames.indexOf(n) > -1)

      this.cleanedColumnsShow = {
        default: defaultColumnsNames,
        show: showColumnsNames,
        min: minColumnsNames,
        configShow: configShowColumnsNames
      }
      this.$log.debug('Cleaned columns show: ', this.cleanedColumnsShow)
    },
    filterShowColumns() {
      this.cleanColumnsShow()
      this.iConfig.columns = this.totalColumns.filter(obj => {
        return this.cleanedColumnsShow.show.indexOf(obj.prop) > -1
      })
    },
    generatePopoverColumns() {
      this.popoverColumns.totalColumnsList = this.totalColumns.filter(obj => {
        if (obj.label) {
          return { prop: obj.prop, label: obj.label }
        }
      })
      this.popoverColumns.currentCols = this.cleanedColumnsShow.show
      this.popoverColumns.minCols = this.cleanedColumnsShow.min
      this.$log.debug('Popover cols: ', this.popoverColumns)
    },
    handlePopoverColumnsChange({ columns, url }) {
      this.$log.debug('Columns change: ', columns)
      this.popoverColumns.currentCols = columns
      const _tableConfig = localStorage.getItem('tableConfig')
        ? JSON.parse(localStorage.getItem('tableConfig'))
        : {}
      const tableName = this.config.name || this.$route.name + '_' + newURL(url).pathname
      _tableConfig[tableName] = {
        'showColumns': columns
      }
      localStorage.setItem('tableConfig', JSON.stringify(_tableConfig))
      this.filterShowColumns()
    },
    filterChange(filters) {
      const key = Object.keys(filters)[0]
      const attr = {}
      attr[key] = filters[key][0]
      this.filterTable(attr)
    }
  }
}
</script>

<style scoped>

</style>
