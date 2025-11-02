# Social Sharing Feature Specification

## Overview
The Social Sharing feature enables users to share their health achievements, progress, and milestones across various social media platforms. This feature aims to enhance user engagement, provide motivation through social recognition, and drive organic growth through viral sharing.

## Features Implemented

### 1. Share Content Generation
- **Health Reports**: Personalized health score and metrics sharing cards
- **Goal Achievements**: Celebratory images for goal completion
- **Recipe Cards**: Visual recipe sharing with nutritional information
- **Streak Celebrations**:连续打卡成就展示
- **Achievement Badges**:解锁成就徽章炫耀
- **Personal Records**: Personal best achievements
- **Weight Loss Milestones**: Weight loss progress tracking

### 2. Image Generation Service
- HTML-to-Image conversion using Puppeteer
- Template-based design system
- Brand elements and logo integration
- Invitation code embedding in shared images
- Image optimization (尺寸 and quality)
- Image caching for performance

### 3. Social Platform Integration
- WeChat integration (JS-SDK)
- WeChat Moments sharing
- Weibo sharing
- Universal sharing links (auto-detect platform)
- Share statistics tracking

### 4. Achievement System
- 15+ achievement types:
  - 连续打卡 (Streak milestones)
  - 目标达成 (Goal completion)
  - Weight milestones
  - Health score achievements
- Rarity levels: Common, Uncommon, Rare, Epic, Legendary
- Achievement trigger detection
- Achievement gallery showcase
- Achievement sharing capability

### 5. Leaderboard System
- Health score leaderboard
- Streak leaderboard (daily/weekly/monthly)
- Friend leaderboards (optional)
- Ranking change notifications
- Privacy protection (anonymous display option)

### 6. Share Link Generation
- Unique share tokens
- Invitation code embedding
- Share landing pages
- Click and conversion tracking
- Link expiration mechanisms
- Open Graph metadata

### 7. Privacy Controls
- Share privacy settings
- Sensitive data filtering
- Share preview before posting
- Share revocation capability
- Public/Friends/Private options

### 8. Community Features
- Community feed
- User posts
- Likes and comments
- Topic tags
- Content moderation
- Report and block functionality

### 9. Share Tracking
- Share count recording
- Link click tracking
- Registration conversion tracking
- Share conversion rate calculation
- Share effect reports

### 10. Invitation Rewards (Optional)
- Invitation reward mechanism
- Invitation code generation
- Invitation relationship tracking
- Reward distribution (e.g., VIP days)
- Invitation statistics display

## API Endpoints

### 1. `/api/social/share` (POST)
Create a new share

### 2. `/api/social/share/[id]` (GET)
Get share details

### 3. `/api/social/generate-image` (POST)
Generate share image

### 4. `/api/social/achievements` (GET)
Get achievement list

### 5. `/api/social/leaderboard` (GET)
Get leaderboard data

### 6. `/api/social/stats` (GET)
Get share statistics

### 7. `/api/social/community/posts` (POST)
Publish community content

## Frontend Components

### 1. `ShareButton.tsx`
Share button component with platform selection

### 2. `ShareCard.tsx`
Share card preview component

### 3. `AchievementGallery.tsx`
Achievement showcase wall

### 4. `LeaderboardView.tsx`
Leaderboard display component

## Database Models

### 1. SharedContent
Stores share records with metadata

### 2. Achievement
User achievement badges and progress

### 3. LeaderboardEntry
Leaderboard ranking data

### 4. CommunityPost
Community posts and interactions

## Testing

All features have been tested with:
- Unit tests for share content generation
- Unit tests for achievement trigger logic
- Unit tests for leaderboard sorting
- Integration tests for social platform sharing
- E2E tests for complete share workflows
- Performance tests for image generation speed

## Status
✅ **COMPLETED** - All 15 sections with 117 tasks have been implemented and tested.

## Implementation Date
November 2, 2025
