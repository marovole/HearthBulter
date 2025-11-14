/**
 * Prisma LeaderboardRepository 占位符实现
 *
 * 当前所有方法抛出 "not implemented" 错误
 * 待后续实现完整的 Prisma 支持
 *
 * @module prisma-leaderboard-repository
 */

import type { FamilyMember, HealthData, LeaderboardEntry, LeaderboardType } from '@prisma/client';
import type {
  HealthDataAggregationResult,
  HealthDataFilter,
  LeaderboardEntryCreateDTO,
  LeaderboardEntryQuery,
  LeaderboardRepository,
  MemberHealthData,
} from '../interfaces/leaderboard-repository';

/**
 * PrismaLeaderboardRepository
 *
 * 占位符实现，待后续完成 Prisma 数据访问层
 */
export class PrismaLeaderboardRepository implements LeaderboardRepository {
  async aggregateHealthDataByMember(_filter: HealthDataFilter): Promise<HealthDataAggregationResult[]> {
    throw new Error('PrismaLeaderboardRepository.aggregateHealthDataByMember not implemented');
  }

  async getMemberHealthData(_memberId: string, _filter?: HealthDataFilter): Promise<MemberHealthData> {
    throw new Error('PrismaLeaderboardRepository.getMemberHealthData not implemented');
  }

  async getMembersHealthData(_memberIds: string[], _filter?: HealthDataFilter): Promise<MemberHealthData[]> {
    throw new Error('PrismaLeaderboardRepository.getMembersHealthData not implemented');
  }

  async getMemberById(_memberId: string): Promise<Pick<FamilyMember, 'id' | 'name' | 'avatar'> | null> {
    throw new Error('PrismaLeaderboardRepository.getMemberById not implemented');
  }

  async getMembersWithHealthData(_filter: HealthDataFilter): Promise<MemberHealthData[]> {
    throw new Error('PrismaLeaderboardRepository.getMembersWithHealthData not implemented');
  }

  async createLeaderboardEntry(_data: LeaderboardEntryCreateDTO): Promise<LeaderboardEntry> {
    throw new Error('PrismaLeaderboardRepository.createLeaderboardEntry not implemented');
  }

  async createLeaderboardEntries(_entries: LeaderboardEntryCreateDTO[]): Promise<LeaderboardEntry[]> {
    throw new Error('PrismaLeaderboardRepository.createLeaderboardEntries not implemented');
  }

  async getLeaderboardEntries(_query: LeaderboardEntryQuery): Promise<LeaderboardEntry[]> {
    throw new Error('PrismaLeaderboardRepository.getLeaderboardEntries not implemented');
  }

  async getLatestLeaderboardEntry(
    _query: Omit<LeaderboardEntryQuery, 'startDate' | 'endDate'>
  ): Promise<LeaderboardEntry | null> {
    throw new Error('PrismaLeaderboardRepository.getLatestLeaderboardEntry not implemented');
  }

  async getRankingHistory(_memberId: string, _type: LeaderboardType, _days?: number): Promise<LeaderboardEntry[]> {
    throw new Error('PrismaLeaderboardRepository.getRankingHistory not implemented');
  }

  async countMemberHealthData(_memberId: string, _filter?: HealthDataFilter): Promise<number> {
    throw new Error('PrismaLeaderboardRepository.countMemberHealthData not implemented');
  }

  async calculateCheckinStreakDays(_memberId: string): Promise<number> {
    throw new Error('PrismaLeaderboardRepository.calculateCheckinStreakDays not implemented');
  }
}
