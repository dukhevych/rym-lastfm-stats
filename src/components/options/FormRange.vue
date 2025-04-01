<template>
  <div class="form-item flex flex-col gap-1">
    <div class="form-label font-bold">
      <label :for="name">{{ props.label }}</label>
    </div>
    <div class="form-input">
      <div class="form-range flex items-center gap-2">
        <div class="w-[100%]">
          <input
            :id="name"
            type="range"
            :name="name"
            class="block w-[100%]"
            v-bind="$attrs"
            :value="props.modelValue"
            :class="{
              'cursor-pointer': !$attrs.disabled,
            }"
            @input="$emit('update:modelValue', $event.target.value)"
          >
          <div class="relative mt-2">
            <div
              class="text-s flex justify-between px-3 text-gray-500"
              :style="{
                'margin-left': `-${rangeNegativeMargin}%`,
                'margin-right': `-${rangeNegativeMargin}%`,
              }"
            >
              <span
                v-for="n in legendRange"
                :key="n"
                class="shrink-0 grow basis-0 text-center"
                :class="{
                  'font-bold': +n === +props.modelValue,
                  'text-gray-500': +n !== +props.modelValue,
                  'text-gray-900 dark:text-gray-100': +n === +props.modelValue,
                }"
              >
                <span
                  class="inline-flex cursor-pointer px-2"
                  @click="$emit('update:modelValue', n)"
                >{{ n }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAttrs, computed } from 'vue';

const props = defineProps({
  label: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    required: true,
  },
  modelValue: {
    type: [String, Number],
    required: true,
  }
});

defineEmits(['update:modelValue']);

defineOptions({
  name: 'FormRange',
  inheritAttrs: false,
});

const $attrs = useAttrs()

const legendRange = computed(() => {
  const min = parseInt($attrs.min ?? 0, 10);
  const max = parseInt($attrs.max ?? 100, 10);
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
});

const rangeNegativeMargin = computed(() => {
  return (100 / (legendRange.value.length - 1) / 2).toFixed(2);
});
</script>
