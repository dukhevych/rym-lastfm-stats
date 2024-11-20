<template>
  <fieldset
    class="form-group focus-within:shadow-lg"
    :class="{
      'pointer-events-none opacity-30 filter grayscale select-none': disabled,
    }"
  >
    <div
      v-if="props.title || $slots.helper"
      class="form-group-header text-xl font-bold bg-rym-gradient text-white p-3 flex justify-between items-center"
    >
      <template v-if="props.title">
        {{ props.title }}
      </template>
      <div
        v-if="$slots.helper"
        class="group relative ml-auto"
      >
        <div
          class="w-5 h-5 rounded-full bg-white text-center text-blue-500 text-sm cursor-pointer"
        >
          ?
        </div>
        <div
          class="absolute right-0 transform mt-2 w-max p-3 bg-gray-700 text-white text-sm rounded hidden group-hover:flex flex-col gap-2 max-w-[250px]"
        >
          <slot name="helper" />
        </div>
      </div>
    </div>

    <div
      class="form-group-body border-x-2 border-b-2 p-3 flex flex-col gap-3 border-gray-300 dark:border-gray-700"
    >
      <component
        :is="child"
        v-for="(child, i) in $slots.default()"
        :key="i"
        :disabled="(child?.props?.disabled ?? false) || (props.inheritDisabled && props.disabled)"
      />
    </div>
  </fieldset>
</template>
<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  inheritDisabled: {
    type: Boolean,
    default: true,
  },
});
</script>
