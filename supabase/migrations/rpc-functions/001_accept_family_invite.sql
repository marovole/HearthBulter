-- RPC Function: accept_family_invite
-- Description: Atomically handle family invitation acceptance with security validation
-- Dependencies: None
-- Returns: Family member record
-- Security: DEFINER with search_path protection and user identity verification

CREATE OR REPLACE FUNCTION accept_family_invite(
  p_invitation_id UUID,
  p_user_id UUID,
  p_member_name TEXT,
  p_gender Gender DEFAULT 'MALE',
  p_birth_date Date DEFAULT '2000-01-01'::Date
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_invitation family_invitations%ROWTYPE;
  v_new_member family_members%ROWTYPE;
  v_family families%ROWTYPE;
  v_existing_member family_members%ROWTYPE;
  v_user_in_other_family BOOLEAN;
  v_user_email TEXT;
BEGIN
  -- Get the actual email from auth.users (server-side verification)
  -- CRITICAL: This prevents attackers from faking the email parameter
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'USER_NOT_FOUND',
      'message', '用户不存在或未认证'
    );
  END IF;

  -- Lock and check if invitation exists, is pending, and user is authorized
  -- SECURITY: Verify user's actual email (from auth.users) matches invitation
  SELECT * INTO v_invitation
  FROM family_invitations
  WHERE id = p_invitation_id
    AND status = 'PENDING'
    AND expires_at > NOW()
    AND LOWER(email) = LOWER(v_user_email)  -- Use verified email from auth.users
  FOR UPDATE NOWAIT;  -- Security: Prevent concurrent acceptance
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INVALID_OR_EXPIRED_INVITATION',
      'message', '邀请不存在、已过期、或您无权使用此邀请'
    );
  END IF;

  -- Check if user is already a member of this family
  SELECT * INTO v_existing_member
  FROM family_members
  WHERE family_id = v_invitation.family_id
    AND user_id = p_user_id
    AND deleted_at IS NULL;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ALREADY_MEMBER',
      'message', '您已经是该家庭的成员'
    );
  END IF;

  -- Check if user is in another family
  SELECT EXISTS(
    SELECT 1 FROM family_members
    WHERE user_id = p_user_id
      AND deleted_at IS NULL
      AND family_id != v_invitation.family_id
  ) INTO v_user_in_other_family;

  IF v_user_in_other_family THEN
    RETURN json_build_object(
      'success', false,
      'error', 'MEMBER_OF_OTHER_FAMILY',
      'message', '您已经属于另一个家庭，请先退出后再加入新家庭'
    );
  END IF;

  -- Get family info
  SELECT * INTO v_family
  FROM families
  WHERE id = v_invitation.family_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'FAMILY_NOT_FOUND',
      'message', '家庭不存在或已被删除'
    );
  END IF;

  -- Start transaction
  BEGIN
    -- Create new family member
    INSERT INTO family_members (
      id,
      family_id,
      user_id,
      name,
      gender,
      birth_date,
      role,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_invitation.family_id,
      p_user_id,
      TRIM(p_member_name),
      p_gender,
      p_birth_date,
      COALESCE(v_invitation.role, 'MEMBER'),
      NOW(),
      NOW()
    )
    RETURNING * INTO v_new_member;

    -- Update invitation status atomically
    -- Note: This is safe because we already locked the row with FOR UPDATE
    UPDATE family_invitations
    SET
      status = 'ACCEPTED',
      updated_at = NOW()
    WHERE id = p_invitation_id;

    -- Return success with data
    RETURN json_build_object(
      'success', true,
      'message', '成功加入家庭',
      'data', json_build_object(
        'family', json_build_object(
          'id', v_family.id,
          'name', v_family.name,
          'description', v_family.description
        ),
        'member', json_build_object(
          'id', v_new_member.id,
          'name', v_new_member.name,
          'role', v_new_member.role,
          'gender', v_new_member.gender,
          'birth_date', v_new_member.birth_date
        ),
        'invitation', json_build_object(
          'id', v_invitation.id,
          'email', v_invitation.email
        )
      )
    );

  EXCEPTION
    WHEN lock_not_available THEN
      -- Concurrent acceptance attempt
      RETURN json_build_object(
        'success', false,
        'error', 'CONCURRENT_ACCEPTANCE',
        'message', '其他用户正在处理此邀请，请稍后重试'
      );
    WHEN unique_violation THEN
      -- Duplicate member (race condition caught by unique constraint)
      RETURN json_build_object(
        'success', false,
        'error', 'ALREADY_MEMBER',
        'message', '您已经是该家庭的成员'
      );
    WHEN OTHERS THEN
      -- Other errors
      RETURN json_build_object(
        'success', false,
        'error', 'TRANSACTION_FAILED',
        'message', '加入家庭失败: ' || SQLERRM
      );
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_family_invite TO authenticated;

-- Add comment
COMMENT ON FUNCTION accept_family_invite IS 'Atomically accept a family invitation and create member record';
