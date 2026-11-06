<?php

namespace App\Models\Concerns;

use App\Models\Scopes\OwnerScope;
use App\Models\User;

trait HasOwner
{
    protected static function bootHasOwner(): void
    {
        static::addGlobalScope(new OwnerScope);
    }

    public function getOwnerColumn(): string
    {
        return 'user_id';
    }

    public function isOwnedBy(User $user): bool
    {
        return (int) $this->getAttribute($this->getOwnerColumn()) === $user->id;
    }
}
