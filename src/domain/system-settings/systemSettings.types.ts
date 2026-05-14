export type SystemSettingItem = {
  key: string
  value: string
  valueType: string
  description: string | null
  minValue?: number
  maxValue?: number
  isSensitive: boolean
  updatedAt: string
}

export type UpdateSystemSettingInput = {
  value: number
}
