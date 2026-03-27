CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`whatsappId` varchar(64) NOT NULL,
	`name` varchar(255),
	`phone` varchar(32),
	`profilePicUrl` text,
	`isGroup` boolean NOT NULL DEFAULT false,
	`tags` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `contacts_whatsappId_unique` UNIQUE(`whatsappId`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`whatsappChatId` varchar(128) NOT NULL,
	`lastMessageAt` timestamp,
	`lastMessageBody` text,
	`lastMessageFromMe` boolean DEFAULT false,
	`unreadCount` int NOT NULL DEFAULT 0,
	`status` enum('active','archived','pending') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversations_whatsappChatId_unique` UNIQUE(`whatsappChatId`)
);
--> statement-breakpoint
CREATE TABLE `followUps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`conversationId` int,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`status` enum('pending','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`isRecurring` boolean NOT NULL DEFAULT false,
	`recurringInterval` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `followUps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messageTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`category` varchar(64) NOT NULL DEFAULT 'general',
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `messageTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`whatsappMessageId` varchar(128) NOT NULL,
	`body` text,
	`fromMe` boolean NOT NULL DEFAULT false,
	`type` varchar(32) NOT NULL DEFAULT 'chat',
	`mediaUrl` text,
	`timestamp` timestamp NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `messages_whatsappMessageId_unique` UNIQUE(`whatsappMessageId`)
);
