<template>
  <el-link @click="goto()">
    <svg-icon icon-class="setting-fill" @click="goto()" />
  </el-link>
</template>

<script>

export default {
  name: 'WebTerminal',
  computed: {},
  methods: {
    goto() {
      this.$router.push({ name: 'SystemSetting' })
    }
  }
}
</script>

<style scoped>
</style>
