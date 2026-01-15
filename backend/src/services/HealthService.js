const mongoose = require('mongoose');
const os = require('os');
const logger = require('../utils/logger');

/**
 * System Health Monitoring Service
 * Provides detailed health status of the application
 */
class HealthService {
  
  /**
   * Get comprehensive system health status
   */
  static async getHealthStatus() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      checks: {}
    };

    try {
      // Database Health
      health.checks.database = await this.checkDatabase();
      
      // Memory Health
      health.checks.memory = this.checkMemory();
      
      // CPU Health
      health.checks.cpu = this.checkCPU();
      
      // Disk Health (if available)
      health.checks.disk = await this.checkDisk();

      // Determine overall status
      const allHealthy = Object.values(health.checks).every(
        check => check.status === 'healthy'
      );
      
      health.status = allHealthy ? 'healthy' : 'degraded';

      const criticalIssue = Object.values(health.checks).some(
        check => check.status === 'unhealthy'
      );
      
      if (criticalIssue) {
        health.status = 'unhealthy';
      }

    } catch (error) {
      logger.error('Health check failed:', error);
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Check database connectivity and performance
   */
  static async checkDatabase() {
    const startTime = Date.now();
    const check = {
      status: 'healthy',
      responseTime: 0
    };

    try {
      if (mongoose.connection.readyState !== 1) {
        check.status = 'unhealthy';
        check.message = 'Database not connected';
        return check;
      }

      // Perform a simple query to test responsiveness
      await mongoose.connection.db.admin().ping();
      
      check.responseTime = Date.now() - startTime;
      check.message = 'Database connected';
      
      // Warn if database is slow
      if (check.responseTime > 1000) {
        check.status = 'degraded';
        check.message = 'Database responding slowly';
      }

      // Get database stats
      const stats = await mongoose.connection.db.stats();
      check.collections = stats.collections;
      check.dataSize = `${(stats.dataSize / (1024 * 1024)).toFixed(2)} MB`;
      check.indexes = stats.indexes;

    } catch (error) {
      check.status = 'unhealthy';
      check.message = error.message;
    }

    return check;
  }

  /**
   * Check memory usage
   */
  static checkMemory() {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercentage = (usedMem / totalMem) * 100;

    const check = {
      status: 'healthy',
      heapUsed: `${(memUsage.heapUsed / (1024 * 1024)).toFixed(2)} MB`,
      heapTotal: `${(memUsage.heapTotal / (1024 * 1024)).toFixed(2)} MB`,
      external: `${(memUsage.external / (1024 * 1024)).toFixed(2)} MB`,
      systemMemoryUsage: `${memPercentage.toFixed(2)}%`,
      systemMemoryFree: `${(freeMem / (1024 * 1024 * 1024)).toFixed(2)} GB`,
      systemMemoryTotal: `${(totalMem / (1024 * 1024 * 1024)).toFixed(2)} GB`
    };

    // Warn if memory usage is high
    if (memPercentage > 90) {
      check.status = 'unhealthy';
      check.message = 'Critical memory usage';
    } else if (memPercentage > 75) {
      check.status = 'degraded';
      check.message = 'High memory usage';
    } else {
      check.message = 'Memory usage normal';
    }

    return check;
  }

  /**
   * Check CPU usage
   */
  static checkCPU() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    // Calculate average CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - Math.floor(100 * idle / total);

    const check = {
      status: 'healthy',
      cores: cpus.length,
      model: cpus[0].model,
      usage: `${usage}%`,
      loadAverage: {
        '1min': loadAvg[0].toFixed(2),
        '5min': loadAvg[1].toFixed(2),
        '15min': loadAvg[2].toFixed(2)
      }
    };

    // Check load average (rule of thumb: load should be less than number of cores)
    if (loadAvg[0] > cpus.length * 2) {
      check.status = 'unhealthy';
      check.message = 'Critical CPU load';
    } else if (loadAvg[0] > cpus.length) {
      check.status = 'degraded';
      check.message = 'High CPU load';
    } else {
      check.message = 'CPU load normal';
    }

    return check;
  }

  /**
   * Check disk space (basic check)
   */
  static async checkDisk() {
    const check = {
      status: 'healthy',
      message: 'Disk check not implemented'
    };

    // Note: Disk space checking requires additional packages like 'diskusage'
    // For now, return a placeholder
    
    return check;
  }

  /**
   * Get quick health check (lightweight)
   */
  static async getQuickHealth() {
    try {
      const isDbConnected = mongoose.connection.readyState === 1;
      
      return {
        status: isDbConnected ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: isDbConnected ? 'connected' : 'disconnected'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Get application metrics
   */
  static async getMetrics() {
    try {
      const { User, PunchLog, NfcTag } = require('../models');

      const metrics = {
        timestamp: new Date().toISOString(),
        users: {
          total: await User.countDocuments(),
          active: await User.countDocuments({ isActive: true }),
          admins: await User.countDocuments({ role: 'Admin' })
        },
        punches: {
          total: await PunchLog.countDocuments(),
          today: await this.getTodayPunchCount(),
          thisWeek: await this.getWeekPunchCount()
        },
        nfcTags: {
          total: await NfcTag.countDocuments(),
          assigned: await NfcTag.countDocuments({ userId: { $ne: null }, isActive: true })
        },
        system: {
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      };

      return metrics;
    } catch (error) {
      logger.error('Failed to get metrics:', error);
      throw error;
    }
  }

  static async getTodayPunchCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { PunchLog } = require('../models');
    return await PunchLog.countDocuments({
      punchTime: { $gte: today }
    });
  }

  static async getWeekPunchCount() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { PunchLog } = require('../models');
    return await PunchLog.countDocuments({
      punchTime: { $gte: weekAgo }
    });
  }
}

module.exports = HealthService;
