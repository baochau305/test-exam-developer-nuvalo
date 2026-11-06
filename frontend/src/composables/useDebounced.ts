import { ref, watch, type Ref } from 'vue'

/** Copy of `source` that only updates once `source` stopped changing for `delay` ms */
export function useDebounced<T>(source: Ref<T>, delay: number): Ref<T> {
  const debounced = ref(source.value) as Ref<T>

  watch(source, (value, _, onCleanup) => {
    const timer = setTimeout(() => (debounced.value = value), delay)
    onCleanup(() => clearTimeout(timer))
  })

  return debounced
}
