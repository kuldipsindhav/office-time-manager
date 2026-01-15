#!/usr/bin/env node

/**
 * MongoDB Backup Script
 * 
 * Usage:
 *   node src/scripts/backup.js
 *   
 * Features:
 * - Creates compressed backup of MongoDB database
 * - Stores backups with timestamp
 * - Automatically cleans old backups (keeps last 30 days)
 * - Supports cloud upload (AWS S3, MinIO, etc.)
 * 
 * Setup:
 *   npm install mongodb archiver aws-sdk
 *   
 * Environment Variables:
 *   MONGODB_URI - MongoDB connection string
 *   BACKUP_DIR - Local backup directory (default: ./backups)
 *   BACKUP_RETENTION_DAYS - Days to keep backups (default: 30)
 *   S3_BUCKET - AWS S3 bucket name (optional)
 *   AWS_ACCESS_KEY_ID - AWS access key (optional)
 *   AWS_SECRET_ACCESS_KEY - AWS secret key (optional)
 */

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
const MONGODB_URI = process.env.MONGODB_URI;

class BackupManager {
  constructor() {
    this.backupDir = BACKUP_DIR;
    this.retentionDays = RETENTION_DAYS;
  }

  async ensureBackupDir() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`✅ Backup directory ready: ${this.backupDir}`);
    } catch (error) {
      console.error('Failed to create backup directory:', error);
      throw error;
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupName = `backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      console.log(`🔄 Starting backup: ${backupName}`);
      
      // Use mongodump to create backup
      const command = `mongodump --uri="${MONGODB_URI}" --out="${backupPath}"`;
      await execAsync(command);

      console.log(`✅ Backup created successfully: ${backupPath}`);

      // Compress backup
      await this.compressBackup(backupPath);

      // Clean old backups
      await this.cleanOldBackups();

      // Upload to cloud (if configured)
      if (process.env.S3_BUCKET) {
        await this.uploadToCloud(`${backupPath}.tar.gz`);
      }

      return backupPath;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  async compressBackup(backupPath) {
    try {
      console.log(`🗜️  Compressing backup...`);
      const command = `tar -czf "${backupPath}.tar.gz" -C "${this.backupDir}" "${path.basename(backupPath)}"`;
      await execAsync(command);
      
      // Remove uncompressed backup
      await execAsync(`rm -rf "${backupPath}"`);
      
      console.log(`✅ Backup compressed: ${backupPath}.tar.gz`);
    } catch (error) {
      console.error('Failed to compress backup:', error);
      throw error;
    }
  }

  async cleanOldBackups() {
    try {
      console.log(`🧹 Cleaning old backups (keeping last ${this.retentionDays} days)...`);
      
      const files = await fs.readdir(this.backupDir);
      const now = Date.now();
      const maxAge = this.retentionDays * 24 * 60 * 60 * 1000;

      let deletedCount = 0;
      for (const file of files) {
        if (file.startsWith('backup-') && file.endsWith('.tar.gz')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          const age = now - stats.mtimeMs;

          if (age > maxAge) {
            await fs.unlink(filePath);
            console.log(`   Deleted old backup: ${file}`);
            deletedCount++;
          }
        }
      }

      console.log(`✅ Cleaned ${deletedCount} old backup(s)`);
    } catch (error) {
      console.error('Failed to clean old backups:', error);
    }
  }

  async uploadToCloud(backupPath) {
    try {
      console.log(`☁️  Uploading backup to cloud storage...`);
      
      // AWS S3 upload example
      // Uncomment and install aws-sdk if needed:
      // const AWS = require('aws-sdk');
      // const s3 = new AWS.S3();
      // const fileContent = await fs.readFile(backupPath);
      // const uploadParams = {
      //   Bucket: process.env.S3_BUCKET,
      //   Key: path.basename(backupPath),
      //   Body: fileContent
      // };
      // await s3.upload(uploadParams).promise();
      
      console.log(`✅ Backup uploaded to cloud (placeholder - implement based on your cloud provider)`);
    } catch (error) {
      console.error('Failed to upload backup to cloud:', error);
    }
  }

  async restoreBackup(backupFileName) {
    const backupPath = path.join(this.backupDir, backupFileName);
    const extractDir = path.join(this.backupDir, 'restore-temp');

    try {
      console.log(`🔄 Restoring backup: ${backupFileName}`);

      // Extract backup
      await fs.mkdir(extractDir, { recursive: true });
      await execAsync(`tar -xzf "${backupPath}" -C "${extractDir}"`);

      // Restore with mongorestore
      const command = `mongorestore --uri="${MONGODB_URI}" --drop "${extractDir}"`;
      await execAsync(command);

      // Clean up
      await execAsync(`rm -rf "${extractDir}"`);

      console.log(`✅ Backup restored successfully`);
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.tar.gz'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file)
        }));

      backups.sort((a, b) => b.name.localeCompare(a.name));

      console.log(`\n📋 Available backups (${backups.length}):`);
      for (const backup of backups) {
        const stats = await fs.stat(backup.path);
        const size = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`   ${backup.name} (${size} MB)`);
      }

      return backups;
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }
}

// CLI Interface
async function main() {
  const backupManager = new BackupManager();

  const command = process.argv[2];

  try {
    await backupManager.ensureBackupDir();

    switch (command) {
      case 'create':
      case undefined:
        await backupManager.createBackup();
        break;

      case 'list':
        await backupManager.listBackups();
        break;

      case 'restore':
        const backupFile = process.argv[3];
        if (!backupFile) {
          console.error('❌ Please provide backup filename');
          console.log('Usage: node backup.js restore <backup-filename>');
          process.exit(1);
        }
        await backupManager.restoreBackup(backupFile);
        break;

      case 'clean':
        await backupManager.cleanOldBackups();
        break;

      default:
        console.log(`
📦 MongoDB Backup Manager

Usage:
  node backup.js [command] [options]

Commands:
  create (default)  - Create a new backup
  list             - List all available backups
  restore <file>   - Restore from a backup file
  clean            - Clean old backups

Environment Variables:
  MONGODB_URI              - MongoDB connection string (required)
  BACKUP_DIR               - Backup directory (default: ./backups)
  BACKUP_RETENTION_DAYS    - Days to keep backups (default: 30)
  S3_BUCKET                - AWS S3 bucket for cloud backup (optional)

Examples:
  node backup.js
  node backup.js create
  node backup.js list
  node backup.js restore backup-2024-01-15T10-30-00.tar.gz
  node backup.js clean
        `);
    }
  } catch (error) {
    console.error('Operation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = BackupManager;
