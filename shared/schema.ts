import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailHash: text("email_hash").unique(),
  role: text("role").notNull().default("user"),
  isPremium: boolean("is_premium").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  trialEndsAt: timestamp("trial_ends_at"),
  premiumUntil: timestamp("premium_until"),
  invitedBy: varchar("invited_by"),
  journeyOnboardingDone: boolean("journey_onboarding_done").notNull().default(false),
  journeyOrder: text("journey_order").array().notNull().default(sql`'{}'::text[]`),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  trialBonusClaimed: boolean("trial_bonus_claimed").notNull().default(false),
  profilePhoto: text("profile_photo"),
  googleId: text("google_id"),
  appleId: text("apple_id"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  adminNotifyNewUser: boolean("admin_notify_new_user").notNull().default(true),
  adminNotifyNewSub: boolean("admin_notify_new_sub").notNull().default(true),
  lastActiveAt: timestamp("last_active_at"),
  pwaInstalled: boolean("pwa_installed").notNull().default(false),
  birthYear: integer("birth_year"),
  interests: text("interests").array(),
  bookUntil: timestamp("book_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  text: text("text").notNull(),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  mood: text("mood"),
  date: text("date").notNull(),
  shareSlug: text("share_slug").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const moodCheckins = pgTable("mood_checkins", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  mood: text("mood").notNull(),
  entry: text("entry").notNull().default(""),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  emailHash: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMoodCheckinSchema = createInsertSchema(moodCheckins).omit({
  id: true,
  createdAt: true,
});

export const feedbackTickets = pgTable("feedback_tickets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull().default("feedback"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFeedbackTicketSchema = createInsertSchema(feedbackTickets).omit({
  id: true,
  createdAt: true,
});

export const journeyProgress = pgTable("journey_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  journeyId: text("journey_id").notNull(),
  completedDays: text("completed_days").array().notNull().default(sql`'{}'::text[]`),
  completedTimestamps: text("completed_timestamps").default("{}"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
});

export const insertJourneyProgressSchema = createInsertSchema(journeyProgress).omit({
  id: true,
  startedAt: true,
  lastActivityAt: true,
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export const scheduledNotifications = pgTable("scheduled_notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url").notNull().default("/"),
  intervalHours: integer("interval_hours").notNull().default(24),
  isActive: boolean("is_active").notNull().default(true),
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduledNotificationSchema = createInsertSchema(scheduledNotifications).omit({
  id: true,
  lastSentAt: true,
  createdAt: true,
});

export type InsertScheduledNotification = z.infer<typeof insertScheduledNotificationSchema>;
export type ScheduledNotification = typeof scheduledNotifications.$inferSelect;

export const autoNotificationConfigs = pgTable("auto_notification_configs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url").notNull().default("/"),
  isActive: boolean("is_active").notNull().default(true),
  triggerHours: integer("trigger_hours").notNull().default(24),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAutoNotificationConfigSchema = createInsertSchema(autoNotificationConfigs).omit({
  id: true,
  createdAt: true,
});

export type InsertAutoNotificationConfig = z.infer<typeof insertAutoNotificationConfigSchema>;
export type AutoNotificationConfig = typeof autoNotificationConfigs.$inferSelect;

export const autoNotificationLogs = pgTable("auto_notification_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export type AutoNotificationLog = typeof autoNotificationLogs.$inferSelect;

export const pushCampaigns = pgTable("push_campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url").notNull().default("/"),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  clickedCount: integer("clicked_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PushCampaign = typeof pushCampaigns.$inferSelect;

export const journeyReports = pgTable("journey_reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  journeyId: text("journey_id").notNull(),
  journeyTitle: text("journey_title").notNull(),
  reportData: text("report_data").notNull(),
  entriesCount: integer("entries_count").notNull().default(0),
  completedDays: integer("completed_days").notNull(),
  totalDays: integer("total_days").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJourneyReportSchema = createInsertSchema(journeyReports).omit({
  id: true,
  createdAt: true,
});

export type InsertJourneyReport = z.infer<typeof insertJourneyReportSchema>;
export type JourneyReport = typeof journeyReports.$inferSelect;

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("premium_days"),
  value: integer("value").notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, usedCount: true, createdAt: true });
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;

export const couponUses = pgTable("coupon_uses", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull().references(() => coupons.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

export type CouponUse = typeof couponUses.$inferSelect;

export const userEvents = pgTable("user_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserEvent = typeof userEvents.$inferSelect;

export const bookChapters = pgTable("book_chapters", {
  id: serial("id").primaryKey(),
  order: integer("order").notNull(),
  title: text("title").notNull(),
  tag: text("tag"),
  excerpt: text("excerpt"),
  content: text("content").notNull().default(""),
  isPreview: boolean("is_preview").notNull().default(false),
  pageType: text("page_type").notNull().default("chapter"),
  pdfPage: integer("pdf_page"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookChapterSchema = createInsertSchema(bookChapters).omit({ id: true, createdAt: true });
export type InsertBookChapter = z.infer<typeof insertBookChapterSchema>;
export type BookChapter = typeof bookChapters.$inferSelect;

export const bookPurchases = pgTable("book_purchases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id").notNull().unique(),
  amountCents: integer("amount_cents").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BookPurchase = typeof bookPurchases.$inferSelect;

export const bookHighlights = pgTable("book_highlights", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id").notNull(),
  subPage: integer("sub_page").notNull().default(0),
  text: text("text").notNull(),
  paraIndex: integer("para_index").notNull(),
  startOffset: integer("start_offset").notNull(),
  endOffset: integer("end_offset").notNull(),
  color: text("color").notNull().default("yellow"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookHighlightSchema = createInsertSchema(bookHighlights).omit({ id: true, createdAt: true });
export type InsertBookHighlight = z.infer<typeof insertBookHighlightSchema>;
export type BookHighlight = typeof bookHighlights.$inferSelect;

export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull().default("partilha"),
  content: text("content").notNull(),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communityComments = pgTable("community_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communityLikes = pgTable("community_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({ id: true, likesCount: true, commentsCount: true, createdAt: true });
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type CommunityPost = typeof communityPosts.$inferSelect;

export const insertCommunityCommentSchema = createInsertSchema(communityComments).omit({ id: true, createdAt: true });
export type InsertCommunityComment = z.infer<typeof insertCommunityCommentSchema>;
export type CommunityComment = typeof communityComments.$inferSelect;

export const chatChannels = pgTable("chat_channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  emoji: text("emoji").default("#"),
  isPrivate: boolean("is_private").default(false).notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull().references(() => chatChannels.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text"),
  imageData: text("image_data"),
  audioData: text("audio_data"),
  type: text("type").notNull().default("text"),
  replyToId: integer("reply_to_id"),
  replyToText: text("reply_to_text"),
  replyToAuthor: text("reply_to_author"),
  deleted: boolean("deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dmConversations = pgTable("dm_conversations", {
  id: serial("id").primaryKey(),
  user1Id: varchar("user1_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  user2Id: varchar("user2_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dmMessages = pgTable("dm_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => dmConversations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text"),
  imageData: text("image_data"),
  audioData: text("audio_data"),
  type: text("type").notNull().default("text"),
  replyToId: integer("reply_to_id"),
  replyToText: text("reply_to_text"),
  replyToAuthor: text("reply_to_author"),
  deleted: boolean("deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userFollows = pgTable("user_follows", {
  id: serial("id").primaryKey(),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const liveSessions = pgTable("live_sessions", {
  id: serial("id").primaryKey(),
  hostId: varchar("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelId: integer("channel_id").references(() => chatChannels.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("live"),
  viewerCount: integer("viewer_count").default(0),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const channelAdmins = pgTable("channel_admins", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull().references(() => chatChannels.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  addedBy: varchar("added_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatChannelSchema = createInsertSchema(chatChannels).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertDmConversationSchema = createInsertSchema(dmConversations).omit({ id: true, createdAt: true });
export const insertDmMessageSchema = createInsertSchema(dmMessages).omit({ id: true, createdAt: true });
export const insertUserFollowSchema = createInsertSchema(userFollows).omit({ id: true, createdAt: true });
export const insertLiveSessionSchema = createInsertSchema(liveSessions).omit({ id: true, startedAt: true });

export type ChatChannel = typeof chatChannels.$inferSelect;
export type InsertChatChannel = z.infer<typeof insertChatChannelSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type DmConversation = typeof dmConversations.$inferSelect;
export type InsertDmConversation = z.infer<typeof insertDmConversationSchema>;
export type DmMessage = typeof dmMessages.$inferSelect;
export type InsertDmMessage = z.infer<typeof insertDmMessageSchema>;
export type UserFollow = typeof userFollows.$inferSelect;
export type InsertUserFollow = z.infer<typeof insertUserFollowSchema>;
export type LiveSession = typeof liveSessions.$inferSelect;
export type InsertLiveSession = z.infer<typeof insertLiveSessionSchema>;
export type ChannelAdmin = typeof channelAdmins.$inferSelect;

export const libraryBooks = pgTable("library_books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull().default(""),
  description: text("description").notNull().default(""),
  coverImageData: text("cover_image_data"),
  pdfData: text("pdf_data"),
  priceDisplay: text("price_display").notNull().default("Grátis"),
  priceInCents: integer("price_in_cents").notNull().default(0),
  requiresPremium: boolean("requires_premium").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(false),
  freePages: integer("free_pages").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLibraryBookSchema = createInsertSchema(libraryBooks).omit({ id: true, createdAt: true });
export type InsertLibraryBook = z.infer<typeof insertLibraryBookSchema>;
export type LibraryBook = typeof libraryBooks.$inferSelect;

export const libraryPages = pgTable("library_pages", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull(),
  pageNumber: integer("page_number").notNull(),
  title: text("title"),
  subtitle: text("subtitle"),
  tag: text("tag"),
  content: text("content").notNull(),
});

export type LibraryPage = typeof libraryPages.$inferSelect;

export const libraryHighlights = pgTable("library_highlights", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookId: integer("book_id").notNull(),
  pageNumber: integer("page_number").notNull(),
  paraIndex: integer("para_index").notNull(),
  startOffset: integer("start_offset").notNull(),
  endOffset: integer("end_offset").notNull(),
  text: text("text").notNull(),
  color: text("color").notNull().default("yellow"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLibraryHighlightSchema = createInsertSchema(libraryHighlights).omit({ id: true, createdAt: true });
export type InsertLibraryHighlight = z.infer<typeof insertLibraryHighlightSchema>;
export type LibraryHighlight = typeof libraryHighlights.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertMoodCheckin = z.infer<typeof insertMoodCheckinSchema>;
export type MoodCheckin = typeof moodCheckins.$inferSelect;
export type InsertFeedbackTicket = z.infer<typeof insertFeedbackTicketSchema>;
export type FeedbackTicket = typeof feedbackTickets.$inferSelect;
export type InsertJourneyProgress = z.infer<typeof insertJourneyProgressSchema>;
export type JourneyProgress = typeof journeyProgress.$inferSelect;
