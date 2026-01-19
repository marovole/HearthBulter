"use client";

import { useCallback, useMemo, useState } from "react";
import {
  FamilyMemberRole,
  Permission,
  ROLE_PERMISSIONS,
} from "@/lib/permissions";

export type PermissionChange = {
  permission: Permission;
  granted: boolean;
};

export type UpdateMemberPermissionsInput = {
  role?: FamilyMemberRole;
  permissionChanges?: PermissionChange[];
};

export type PermissionMatrix = Partial<Record<FamilyMemberRole, Permission[]>>;

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);

  const permissionMatrix = useMemo<PermissionMatrix>(
    () => ROLE_PERMISSIONS,
    [],
  );

  const updateMemberPermissions = useCallback(
    async (_memberId: string, _input: UpdateMemberPermissionsInput) => {
      setLoading(true);
      try {
        await Promise.resolve();
        setPermissions((current) => current);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { permissions, loading, updateMemberPermissions, permissionMatrix };
}
