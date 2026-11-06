/** Single Laravel JsonResource: `{ data: T }` */
export interface ApiResource<T> {
  data: T
}

/** Laravel paginated ResourceCollection */
export interface Paginated<T> {
  data: T[]
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
}

/** Body of a 422 response */
export interface ValidationErrorBody {
  message: string
  errors: Record<string, string[]>
}
