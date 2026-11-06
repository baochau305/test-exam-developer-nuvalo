import axios from 'axios'

import type { ValidationErrorBody } from '@/types/api'

/** Turns any thrown error into a message that can be shown to the user */
export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  if (axios.isAxiosError<Partial<ValidationErrorBody>>(error)) {
    if (!error.response) {
      return 'Cannot reach the server. Please check your connection.'
    }

    return error.response.data?.message || fallback
  }

  return error instanceof Error ? error.message : fallback
}
