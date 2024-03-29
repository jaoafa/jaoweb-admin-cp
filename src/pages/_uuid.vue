<template>
  <div class="main-container">
    <h1 class="text-center">{{ pageTitle }}</h1>

    <v-autocomplete
      v-model="selected"
      :items="items"
      :loading="isSearchLoading"
      :search-input.sync="search"
      item-text="mcid"
      no-filter
      label="Minecraft ID or UUID"
      placeholder="表示するユーザーの MinecraftID もしくは UUID を入力してください。"
      prepend-icon="mdi-database-search"
      return-object
    />

    <v-pagination
      v-model="page"
      :length="getTotalPage()"
      @input="fetchData()"
    />
    <ul class="counters">
      <v-tooltip bottom>
        <template #activator="{ on, attrs }">
          <li
            v-bind="attrs"
            class="pointer"
            @click="filter = 'place'"
            v-on="on"
          >
            設置 {{ count.place }} 回 (RB: {{ count.rollbackPlace }})
          </li>
        </template>
        <span>クリックすると設置履歴のみ表示します</span>
      </v-tooltip>

      <v-tooltip bottom>
        <template #activator="{ on, attrs }">
          <li
            v-bind="attrs"
            class="pointer"
            @click="filter = 'destroy'"
            v-on="on"
          >
            破壊 {{ count.destroy }} 回 (RB: {{ count.rollbackDestroy }})
          </li>
        </template>
        <span>クリックすると破壊履歴のみ表示します</span>
      </v-tooltip>

      <v-tooltip bottom>
        <template #activator="{ on, attrs }">
          <li v-bind="attrs" class="pointer" @click="filter = null" v-on="on">
            計 {{ count.all }} 回 (Mobキル・クリック含)
          </li>
        </template>
        <span>クリックすると設置破壊履歴を表示します</span>
      </v-tooltip>
    </ul>

    <v-data-table
      :loading="isLoading"
      :headers="headers"
      :items="data"
      disable-filtering
      disable-sort
      disable-pagination
      hide-default-footer
      class="my-5"
    >
      <template #[`item.time`]="{ item }">
        {{ formatDate(new Date(item.time * 1000), 'yyyy/MM/dd HH:mm:ss') }}
      </template>

      <template #[`item.world`]="{ item }">
        {{ item.world.name }}
      </template>

      <template #[`item.action`]="{ item }">
        <span :class="getActionColor(item.action) + '--text'">
          {{ getActionName(item.action) }}
        </span>
      </template>

      <template #[`item.material`]="{ item }">
        {{ item.material.material }}
      </template>

      <template #[`item.blockdata`]="{ item }">
        <v-dialog v-if="item.blockdata.length != 0" width="500">
          <template #activator="{ on, attrs }">
            <v-btn color="primary" v-bind="attrs" v-on="on"> 見る </v-btn>
          </template>

          <template #default="dialog">
            <v-card>
              <v-card-text>
                <ul class="pa-12">
                  <li v-for="blockdata of item.blockdata" :key="blockdata.id">
                    {{ blockdata.data }}
                  </li>
                </ul>
              </v-card-text>
              <v-card-actions class="justify-end">
                <v-btn text @click="dialog.value = false">Close</v-btn>
              </v-card-actions>
            </v-card>
          </template>
        </v-dialog>
      </template>

      <template #[`item.copyTp`]="{ item }">
        <v-btn
          color="primary"
          @click.stop="copy('/tp ' + item.x + ' ' + item.y + ' ' + item.z)"
        >
          Copy
        </v-btn>
      </template>
    </v-data-table>

    <v-pagination
      v-model="page"
      :length="getTotalPage()"
      @input="fetchData()"
    />

    <v-snackbar v-model="snackbar">
      {{ snackbarText }}
      <template #action="{ attrs }">
        <v-btn color="pink" text v-bind="attrs" @click="snackbar = false">
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { DataTableHeader } from 'vuetify'
import { CountInterface, EditData } from '~/api/models/EditDataResult'
import User from '~/api/models/User'

export default Vue.extend({
  data(): {
    selected: User | null
    items: User[]
    isLoading: boolean
    isSearchLoading: boolean
    search: string
    count: CountInterface
    data: EditData[]
    headers: DataTableHeader[]
    page: number
    snackbar: boolean
    snackbarText: string | null
    filter: 'place' | 'destroy' | null
    siteName: string
    pageTitle: string
  } {
    return {
      selected: null,
      items: [],
      isLoading: false,
      isSearchLoading: false,
      search: '',
      count: {
        place: 0,
        destroy: 0,
        rollbackPlace: 0,
        rollbackDestroy: 0,
        all: 0,
      },
      data: [],
      headers: [
        {
          text: 'Time',
          value: 'time',
        },
        {
          text: 'Action',
          value: 'action',
        },
        {
          text: 'World',
          value: 'world',
        },
        {
          text: 'X',
          value: 'x',
        },
        {
          text: 'Y',
          value: 'y',
        },
        {
          text: 'Z',
          value: 'z',
        },
        {
          text: 'Block',
          value: 'material',
        },
        {
          text: 'BlockData',
          value: 'blockdata',
        },
        {
          text: 'Rollbacked',
          value: 'rollbacked',
        },
        {
          text: 'Copy',
          value: 'copyTp',
        },
      ],
      page: 1,
      snackbar: false,
      snackbarText: null,
      filter: null,
      siteName: 'jMS Admin CP',
      pageTitle: 'CoreProtect Viewer',
    }
  },

  head() {
    return {
      // @ts-ignore
      title: this.pageTitle,
    }
  },

  watch: {
    search() {
      if (this.search === null || this.search.length === 0) return
      if (this.isSearchLoading) return
      this.isSearchLoading = true
      fetch('/cp/api/users/' + this.search)
        .then((res) => res.json())
        .then((res) => {
          this.items = res
        })
        .catch((err) => {
          this.snackbarText =
            '処理中にエラーが発生しました。少しおいてからもう一度お試しください'
          // eslint-disable-next-line no-console
          console.log(err)
        })
        .finally(() => (this.isSearchLoading = false))
    },
    selected() {
      this.fetchData()
    },
    snackbar() {
      if (!this.snackbar) this.snackbarText = null
    },
    snackbarText() {
      this.snackbar = this.snackbarText != null
    },
    filter() {
      this.fetchData()
    },
  },

  created() {
    this.siteName = this.$config.siteName || 'jMS Admin CP'
    this.pageTitle = this.$config.siteTitle || 'CoreProtect Viewer'
  },

  mounted() {
    if ('uuid' in this.$route.params) {
      if ('filter' in this.$route.query) {
        this.filter = this.$route.query.filter as 'place' | 'destroy' | null
      }
      this.isSearchLoading = true
      fetch('/cp/api/')
        .then((res) => res.json())
        .then((res) => {
          if (!res.override) return
          this.siteName = res.override.siteName || this.siteName
          this.pageTitle = res.override.pageTitle || this.pageTitle
        })

      fetch(
        '/cp/api/users/' + this.$route.params.uuid + '?filter=' + this.filter
      )
        .then((res) => res.json())
        .then((res) => {
          if (res.length === 1) {
            this.selected = res[0]
            this.items = res
          }
        })
        .catch((err) => {
          this.snackbarText =
            '処理中にエラーが発生しました。少しおいてからもう一度お試しください'
          // eslint-disable-next-line no-console
          console.log(err)
        })
        .finally(() => (this.isSearchLoading = false))
    }
  },

  methods: {
    formatDate(date: Date, format: string): string {
      format = format.replace(/yyyy/g, String(date.getFullYear()))
      format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2))
      format = format.replace(/dd/g, ('0' + date.getDate()).slice(-2))
      format = format.replace(/HH/g, ('0' + date.getHours()).slice(-2))
      format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2))
      format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2))
      format = format.replace(/SSS/g, ('00' + date.getMilliseconds()).slice(-3))
      return format
    },
    getActionColor(action: number): string {
      switch (action) {
        case 0:
          return 'red'
        case 1:
          return 'green'
      }
      return String(action)
    },
    getActionName(action: number): string {
      switch (action) {
        case 0:
          return 'Break'
        case 1:
          return 'Place'
      }
      return String(action)
    },
    getTotalPage() {
      const count =
        this.filter === null
          ? this.count.all
          : this.filter === 'place'
          ? this.count.place
          : this.count.destroy
      return Math.ceil(count / 50)
    },
    fetchData() {
      const selected = this.selected
      if (selected === null) return
      this.data = []
      this.isLoading = true
      const sp = new URLSearchParams()
      if (this.filter !== null) sp.append('filter', this.filter)
      if (this.page !== 1) sp.append('page', this.page.toString())

      history.replaceState(
        {},
        '',
        '/cp/' +
          selected.uuid +
          (sp.toString().length > 0 ? '?' + sp.toString() : '')
      )
      fetch(
        '/cp/api/users/' +
          selected.userid +
          '/' +
          this.page +
          '?filter=' +
          this.filter
      )
        .then((res) => res.json())
        .then((res) => {
          this.count = res.count
          this.data = res.data
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.log(err)
        })
        .finally(() => (this.isLoading = false))
    },
    copy(str: string): void {
      this.$copyText(str)
      this.snackbarText = 'tpコマンドをコピーしました！'
    },
  },
})
</script>

<style lang="scss" scoped>
.counters {
  width: 100%;
  display: flex;
  list-style: none;
  justify-content: space-around;
  margin: 10px;

  li {
    margin: 0 0.3em;
  }
}

.pointer {
  cursor: pointer;
}
</style>
