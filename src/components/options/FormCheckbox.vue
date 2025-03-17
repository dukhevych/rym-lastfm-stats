<template>
  <div
    class="form-item flex flex-col gap-1"
    :class="{ 'pointer-events-none opacity-50': $attrs.disabled }"
  >
    <div class="form-input">
      <label
        :for="props.name"
        class="flex cursor-pointer items-center gap-2"
      >
        <div class="relative">
          <input
            :id="props.name"
            :checked="props.modelValue"
            type="checkbox"
            class="peer sr-only"
            v-bind="$attrs"
            @input="$emit('update:modelValue', $event.target.checked)"
          >
          <div
            class="
              peer h-6 w-11 rounded-full bg-gray-300
              after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full
              after:border after:border-gray-300 after:bg-white after:transition-all
              after:content-['']
              peer-checked:bg-blue-600 peer-checked:after:translate-x-full
              peer-checked:after:border-white
              peer-focus-visible:ring-4
              dark:border-gray-800 dark:bg-gray-700
            "
            :title="`Click to ${props.modelValue ? 'disable' : 'enable'}`"
          />
        </div>
        <span class="text-lg font-bold">{{ props.label }}</span>
      </label>
    </div>
  </div>
</template>
<script setup>
const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  modelValue: {
    type: Boolean,
    required: true,
  }
});

defineEmits(['update:modelValue']);

defineOptions({
  name: 'FormCheckbox',
  inheritAttrs: false,
});
</script>
