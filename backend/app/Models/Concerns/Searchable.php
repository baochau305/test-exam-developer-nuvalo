<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

trait Searchable
{
    /**
     * @param  list<string>  $columns
     */
    public function scopeSearch(Builder $query, string $term, array $columns): void
    {
        $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';

        $query->where(function (Builder $query) use ($columns, $pattern) {
            foreach ($columns as $column) {
                $query->orWhereRaw($query->getGrammar()->wrap($column)." LIKE ? ESCAPE '!'", [$pattern]);
            }
        });
    }
}
