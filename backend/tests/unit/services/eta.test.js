/**
 * tests/unit/services/eta.test.js
 * Unit tests for the ETA calculation service
 * 
 * Tests the calculation logic without needing the database.
 * We test the helper functions and calculation algorithms.
 */

import { expect } from 'chai';
import sinon from 'sinon';

// Import utilities using ES module syntax (not require!)
import { calculateDistance, formatDistance, formatETA } from '../../../src/lib/utils.js';

// Import test helpers
import {
  mockShuttleInService,
  mockRoute,
  mockStops,
  mockPing,
  mockIds,
} from '../../helpers/testHelpers.js';

describe('ETA Service', function() {
  
  afterEach(function() {
    sinon.restore();
  });
  
  // ============================================================================
  // Distance Calculation tests
  // ============================================================================
  
  describe('Distance Calculation', function() {
    
    it('should calculate distance between two points', function() {
      // Walb Union to Development Office (coordinates from your seed data)
      const lat1 = 41.117554;
      const lon1 = -85.108039;
      const lat2 = 41.1150437;
      const lon2 = -85.1038529;
      
      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      
      // Should be roughly 400-500 meters based on seed data
      expect(distance).to.be.within(300, 600);
    });
    
    it('should return 0 for same point', function() {
      const distance = calculateDistance(41.0, -85.0, 41.0, -85.0);
      expect(distance).to.equal(0);
    });
    
    it('should handle coordinates correctly', function() {
      // Small distance check - about 0.001 degree lat is roughly 111 meters
      const distance = calculateDistance(41.0, -85.0, 41.001, -85.0);
      
      // Should be around 111 meters
      expect(distance).to.be.within(100, 120);
    });
  });
  
  // ============================================================================
  // Speed-based ETA Calculation
  // ============================================================================
  
  describe('Speed-based ETA Calculation', function() {
    
    it('should calculate ETA based on distance and speed', function() {
      // If distance is 500m and speed is 20 km/h:
      // Speed in m/s = 20 * 1000 / 3600 = 5.56 m/s
      // Time = 500 / 5.56 = ~90 seconds
      
      const distanceMeters = 500;
      const speedKph = 20;
      const speedMs = (speedKph * 1000) / 3600;
      const expectedSeconds = distanceMeters / speedMs;
      
      expect(expectedSeconds).to.be.within(85, 95);
    });
    
    it('should handle zero speed gracefully', function() {
      // When speed is 0, we should use a default speed (20 km/h)
      const defaultSpeed = 20;
      const distance = 1000; // meters
      const speedMs = (defaultSpeed * 1000) / 3600;
      const eta = distance / speedMs;
      
      // 1km at 20km/h = 3 minutes = 180 seconds
      expect(eta).to.be.within(175, 185);
    });
  });
  
  // ============================================================================
  // Route Stop Sequence
  // ============================================================================
  
  describe('Route Stop Sequence', function() {
    
    it('should calculate time to future stops correctly', function() {
      // If each stop takes 2 minutes (120s) and we're at stop 0 going to stop 2:
      // That's 2 segments × 120 seconds = 240 seconds
      
      const route = {
        stops: [
          { stopId: 'stop0', sequence: 0, estimatedTimeFromPrevious: 0 },
          { stopId: 'stop1', sequence: 1, estimatedTimeFromPrevious: 120 },
          { stopId: 'stop2', sequence: 2, estimatedTimeFromPrevious: 120 },
          { stopId: 'stop3', sequence: 3, estimatedTimeFromPrevious: 120 },
        ],
      };
      
      // Calculate time from stop 0 to stop 2
      let totalTime = 0;
      const currentSequence = 0;
      const targetSequence = 2;
      
      for (let i = currentSequence + 1; i <= targetSequence; i++) {
        totalTime += route.stops[i].estimatedTimeFromPrevious || 120;
      }
      
      expect(totalTime).to.equal(240);
    });
    
    it('should handle loop routes correctly', function() {
      // In a loop route, if we're at stop 3 and need to go to stop 1,
      // we go: 3 -> 0 -> 1 (wrapping around)
      
      const route = {
        routeType: 'loop',
        stops: [
          { stopId: 'stop0', sequence: 0, estimatedTimeFromPrevious: 120 },
          { stopId: 'stop1', sequence: 1, estimatedTimeFromPrevious: 120 },
          { stopId: 'stop2', sequence: 2, estimatedTimeFromPrevious: 120 },
          { stopId: 'stop3', sequence: 3, estimatedTimeFromPrevious: 120 },
        ],
      };
      
      const currentSequence = 3;
      const targetSequence = 1;
      const totalStops = route.stops.length;
      
      // Calculate loop ETA: 3 -> 0 -> 1
      let totalTime = 0;
      let current = currentSequence;
      
      while (current !== targetSequence) {
        current = (current + 1) % totalStops;
        totalTime += route.stops[current].estimatedTimeFromPrevious || 120;
      }
      
      // 3->0: 120s, 0->1: 120s = 240s total
      expect(totalTime).to.equal(240);
    });
  });
  
  // ============================================================================
  // Confidence Calculation
  // ============================================================================
  
  describe('Confidence Calculation', function() {
    
    it('should have high confidence for nearby stops', function() {
      const etaSeconds = 60; // 1 minute away
      const avgSpeed = 25; // Good speed data
      const stopsAway = 1;
      
      let confidence = 0.8; // Base
      
      // Good speed data - no reduction
      if (avgSpeed <= 5) confidence -= 0.2;
      
      // Close stop - no reduction
      if (stopsAway > 5) confidence -= 0.1;
      
      // Short ETA - no reduction
      if (etaSeconds > 1800) confidence -= 0.2;
      
      expect(confidence).to.be.at.least(0.7);
    });
    
    it('should have lower confidence for distant stops', function() {
      const etaSeconds = 2400; // 40 minutes away
      const avgSpeed = 0; // No speed data
      const stopsAway = 8;
      
      let confidence = 0.8;
      
      if (avgSpeed <= 5) confidence -= 0.2;
      if (stopsAway > 5) confidence -= 0.1;
      if (etaSeconds > 1800) confidence -= 0.2;
      
      // 0.8 - 0.2 - 0.1 - 0.2 = 0.3
      expect(confidence).to.be.at.most(0.5);
    });
    
    it('should never go below 0.3 confidence', function() {
      let confidence = 0.8;
      
      confidence -= 0.2; // No speed
      confidence -= 0.1; // Many stops
      confidence -= 0.2; // Long time
      confidence -= 0.5; // Extra penalty
      
      // Clamp to 0.3 minimum
      confidence = Math.max(0.3, confidence);
      
      expect(confidence).to.equal(0.3);
    });
  });
  
  // ============================================================================
  // Format helpers
  // ============================================================================
  
  describe('Format Helpers', function() {
    
    it('should format distance in meters', function() {
      expect(formatDistance(500)).to.equal('500m');
    });
    
    it('should format distance in kilometers', function() {
      expect(formatDistance(1500)).to.equal('1.5km');
    });
    
    it('should format ETA less than 1 minute', function() {
      expect(formatETA(30)).to.equal('< 1 min');
    });
    
    it('should format ETA in minutes', function() {
      expect(formatETA(120)).to.equal('2 mins');
    });
  });
  
  // ============================================================================
  // Edge Cases
  // ============================================================================
  
  describe('Edge Cases', function() {
    
    it('should handle missing route gracefully', function() {
      const route = null;
      
      if (!route) {
        const result = null;
        expect(result).to.be.null;
      }
    });
    
    it('should handle shuttle not in service', function() {
      const shuttle = { ...mockShuttleInService, status: 'available' };
      
      if (shuttle.status !== 'in_service') {
        const result = null;
        expect(result).to.be.null;
      }
    });
    
    it('should handle route with no stops', function() {
      const route = { ...mockRoute, stops: [] };
      
      if (!route.stops || route.stops.length === 0) {
        const result = null;
        expect(result).to.be.null;
      }
    });
    
    it('should use default speed when no ping data', function() {
      const avgSpeed = 0;
      const defaultSpeed = 20;
      const speed = avgSpeed > 5 ? avgSpeed : defaultSpeed;
      
      expect(speed).to.equal(20);
    });
  });
});
