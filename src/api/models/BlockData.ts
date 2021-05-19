import { RowDataPacket } from "mysql2"
import { getHatDBConnection } from "../lib/mysql"

export interface BlockData {
  id: number
  data: string
}

const cache: Map<number, BlockData> = new Map()

export async function fetch(): Promise<boolean> {
  const conn = await getHatDBConnection()
  if (conn == null) {
    return false
  }

  const [rows] = await conn.execute("SELECT * FROM co_blockdata_map") as RowDataPacket[][]
  cache.clear()
  for (const row of rows) {
    cache.set(row.rowid, {
      id: row.rowid,
      data: row.data
    })
  }
  return true
}

/**
 * ブロックデータIDに合うブロックデータオブジェクトを返します。
 *
 * @param id ブロックデータID
 * @returns ブロックデータオブジェクト、なければ null
 */
export async function getBlockData(id: number): Promise<BlockData | null> {
  if (!cache.has(id)) {
    await fetch()
    if (!cache.has(id)) return null
  }
  return cache.get(id) as BlockData
}
