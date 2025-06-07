import { Injectable } from '@nestjs/common';
import { LoggingService } from '../logging/logging.service';

interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

@Injectable()
export class MetricsService {
  private metrics: Map<string, Metric[]> = new Map();

  constructor(private readonly loggingService: LoggingService) {}

  recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): void {
    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metric);

    // Keep only last 1000 metrics per name
    if (this.metrics.get(name)!.length > 1000) {
      this.metrics.get(name)!.shift();
    }

    this.loggingService.debug('Metric recorded', 'MetricsService', metric);
  }

  incrementCounter(name: string, tags?: Record<string, string>): void {
    const currentValue = this.getCurrentValue(name) || 0;
    this.recordMetric(name, currentValue + 1, tags);
  }

  decrementCounter(name: string, tags?: Record<string, string>): void {
    const currentValue = this.getCurrentValue(name) || 0;
    this.recordMetric(name, Math.max(0, currentValue - 1), tags);
  }

  recordDuration(
    name: string,
    startTime: number,
    tags?: Record<string, string>,
  ): void {
    const duration = Date.now() - startTime;
    this.recordMetric(name, duration, tags);
  }

  recordGauge(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): void {
    this.recordMetric(name, value, tags);
  }

  getMetrics(name?: string): Record<string, Metric[]> {
    if (name) {
      return { [name]: this.metrics.get(name) || [] };
    }
    
    const result: Record<string, Metric[]> = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    
    return result;
  }

  private getCurrentValue(name: string): number | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return null;
    }
    return metrics[metrics.length - 1].value;
  }

  clearMetrics(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }
}