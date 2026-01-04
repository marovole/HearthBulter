/**
 * accept_family_invite RPC 函数测试
 */

import { createClient } from '@supabase/supabase-js';

describe('accept_family_invite RPC', () => {
  let supabase: any;
  let testData: {
    userId: string;
    familyId: string;
    invitationId: string;
  };

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );
  });

  beforeEach(async () => {
    // Create test data
    testData = {
      userId: 'user-test-123',
      familyId: 'family-test-456',
      invitationId: 'invite-test-789',
    };

    // Clean up any existing test data
    await supabase
      .from('family_invitation')
      .delete()
      .eq('id', testData.invitationId);

    await supabase
      .from('family_member')
      .delete()
      .eq('user_id', testData.userId);
  });

  afterEach(async () => {
    // Clean up test data
    await supabase
      .from('family_invitation')
      .delete()
      .eq('id', testData.invitationId);

    await supabase
      .from('family_member')
      .delete()
      .eq('user_id', testData.userId);
  });

  describe('Successful invitation acceptance', () => {
    it('should create member and update invitation status', async () => {
      // Arrange: Create family and invitation
      await supabase.from('family').insert({
        id: testData.familyId,
        name: 'Test Family',
        creatorId: 'user-creator-123',
      });

      await supabase.from('family_invitation').insert({
        id: testData.invitationId,
        family_id: testData.familyId,
        email: 'test@example.com',
        role: 'MEMBER',
        status: 'PENDING',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Act
      const { data, error } = await supabase.rpc('accept_family_invite', {
        p_invitation_id: testData.invitationId,
        p_user_id: testData.userId,
        p_member_name: 'Test User',
        p_gender: 'MALE',
        p_birth_date: '1990-01-01',
      });

      // Assert
      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.message).toBe('成功加入家庭');
      expect(data.data.member.name).toBe('Test User');
      expect(data.data.member.role).toBe('MEMBER');

      // Verify invitation status updated
      const { data: invitation } = await supabase
        .from('family_invitation')
        .select('status')
        .eq('id', testData.invitationId)
        .single();

      expect(invitation.status).toBe('ACCEPTED');

      // Verify member created
      const { data: member } = await supabase
        .from('family_member')
        .select('*')
        .eq('user_id', testData.userId)
        .eq('family_id', testData.familyId)
        .single();

      expect(member).not.toBeNull();
      expect(member.name).toBe('Test User');
    });
  });

  describe('Error scenarios', () => {
    it('should return error if invitation does not exist', async () => {
      // Act
      const { data, error } = await supabase.rpc('accept_family_invite', {
        p_invitation_id: 'non-existent-id',
        p_user_id: testData.userId,
        p_member_name: 'Test User',
      });

      // Assert
      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.error).toBe('邀请不存在或已过期');
    });

    it('should return error if invitation is already accepted', async () => {
      // Arrange
      await supabase.from('family').insert({
        id: testData.familyId,
        name: 'Test Family',
        creatorId: 'user-creator-123',
      });

      await supabase.from('family_invitation').insert({
        id: testData.invitationId,
        family_id: testData.familyId,
        email: 'test@example.com',
        status: 'ACCEPTED', // Already accepted
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Act
      const { data, error } = await supabase.rpc('accept_family_invite', {
        p_invitation_id: testData.invitationId,
        p_user_id: testData.userId,
        p_member_name: 'Test User',
      });

      // Assert
      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.error).toBe('邀请不存在或已过期');
    });

    it('should return error if invitation is expired', async () => {
      // Arrange
      await supabase.from('family').insert({
        id: testData.familyId,
        name: 'Test Family',
        creatorId: 'user-creator-123',
      });

      await supabase.from('family_invitation').insert({
        id: testData.invitationId,
        family_id: testData.familyId,
        email: 'test@example.com',
        status: 'PENDING',
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
      });

      // Act
      const { data, error } = await supabase.rpc('accept_family_invite', {
        p_invitation_id: testData.invitationId,
        p_user_id: testData.userId,
        p_member_name: 'Test User',
      });

      // Assert
      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.error).toBe('邀请不存在或已过期');
    });

    it('should return error if user is already a member', async () => {
      // Arrange
      await supabase.from('family').insert({
        id: testData.familyId,
        name: 'Test Family',
        creatorId: 'user-creator-123',
      });

      await supabase.from('family_member').insert({
        family_id: testData.familyId,
        user_id: testData.userId,
        name: 'Existing Member',
        gender: 'MALE',
        birth_date: '1990-01-01',
        role: 'MEMBER',
      });

      await supabase.from('family_invitation').insert({
        id: testData.invitationId,
        family_id: testData.familyId,
        email: 'test@example.com',
        status: 'PENDING',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Act
      const { data, error } = await supabase.rpc('accept_family_invite', {
        p_invitation_id: testData.invitationId,
        p_user_id: testData.userId,
        p_member_name: 'Test User',
      });

      // Assert
      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.error).toBe('您已经是该家庭的成员');
    });

    it('should return error if user is in another family', async () => {
      // Arrange
      const otherFamilyId = 'family-other-999';

      await supabase.from('family').insert([
        {
          id: testData.familyId,
          name: 'Test Family',
          creatorId: 'user-creator-123',
        },
        {
          id: otherFamilyId,
          name: 'Other Family',
          creatorId: 'user-creator-456',
        },
      ]);

      // User is already in another family
      await supabase.from('family_member').insert({
        family_id: otherFamilyId,
        user_id: testData.userId,
        name: 'User in Other Family',
        gender: 'MALE',
        birth_date: '1990-01-01',
        role: 'MEMBER',
      });

      await supabase.from('family_invitation').insert({
        id: testData.invitationId,
        family_id: testData.familyId,
        email: 'test@example.com',
        status: 'PENDING',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Act
      const { data, error } = await supabase.rpc('accept_family_invite', {
        p_invitation_id: testData.invitationId,
        p_user_id: testData.userId,
        p_member_name: 'Test User',
      });

      // Assert
      expect(error).toBeNull();
      expect(data.success).toBe(false);
      expect(data.error).toBe('您已经属于另一个家庭，请先退出后再加入新家庭');
    });

    it('should handle concurrent acceptance correctly', async () => {
      // Arrange
      await supabase.from('family').insert({
        id: testData.familyId,
        name: 'Test Family',
        creatorId: 'user-creator-123',
      });

      await supabase.from('family_invitation').insert({
        id: testData.invitationId,
        family_id: testData.familyId,
        email: 'test@example.com',
        status: 'PENDING',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Act: Simulate concurrent calls
      const promises = Array(3)
        .fill(null)
        .map(() =>
          supabase.rpc('accept_family_invite', {
            p_invitation_id: testData.invitationId,
            p_user_id: testData.userId,
            p_member_name: 'Test User',
          }),
        );

      const results = await Promise.all(promises);

      // Assert: Only one should succeed
      const successCount = results.filter((r) => r.data?.success).length;
      expect(successCount).toBe(1);

      const errorCount = results.filter(
        (r) => r.data?.success === false,
      ).length;
      expect(errorCount).toBe(2);
    });
  });
});
