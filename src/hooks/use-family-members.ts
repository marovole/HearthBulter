"use client";

import { useEffect, useState } from "react";
import type { FamilyMemberRole } from "@/lib/permissions";

export type FamilyMember = {
  id: string;
  name: string;
  role: FamilyMemberRole;
  deletedAt?: string | null;
  updatedAt?: string | null;
};

export function useFamilyMembers(familyId?: string) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!familyId) {
      setMembers([]);
      return;
    }

    let isMounted = true;
    const loadMembers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/families/${familyId}/members`);
        if (!response.ok) {
          setMembers([]);
          return;
        }
        const data = await response.json();
        const items = Array.isArray(data.members)
          ? data.members
          : Array.isArray(data.data)
            ? data.data
            : [];
        if (isMounted) {
          setMembers(items as FamilyMember[]);
        }
      } catch {
        if (isMounted) {
          setMembers([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadMembers();

    return () => {
      isMounted = false;
    };
  }, [familyId]);

  return { members, loading };
}
