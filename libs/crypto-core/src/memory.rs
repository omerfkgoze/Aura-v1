use wasm_bindgen::prelude::*;
use zeroize::Zeroize;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;

/// Global memory statistics tracking
static MEMORY_STATS: once_cell::sync::Lazy<Arc<Mutex<MemoryStatistics>>> =
    once_cell::sync::Lazy::new(|| {
        Arc::new(Mutex::new(MemoryStatistics::new()))
    });

/// Memory statistics structure
#[derive(Debug, Clone)]
struct MemoryStatistics {
    active_allocations: usize,
    total_heap_usage: usize,
    buffer_allocations: HashMap<String, usize>,
}

impl MemoryStatistics {
    fn new() -> Self {
        MemoryStatistics {
            active_allocations: 0,
            total_heap_usage: 0,
            buffer_allocations: HashMap::new(),
        }
    }

    fn increment_allocation(&mut self, size: usize, buffer_type: &str) {
        self.active_allocations += 1;
        self.total_heap_usage += size;
        *self.buffer_allocations.entry(buffer_type.to_string()).or_insert(0) += 1;
    }

    fn decrement_allocation(&mut self, size: usize, buffer_type: &str) {
        if self.active_allocations > 0 {
            self.active_allocations -= 1;
        }
        if self.total_heap_usage >= size {
            self.total_heap_usage -= size;
        }
        if let Some(count) = self.buffer_allocations.get_mut(buffer_type) {
            if *count > 0 {
                *count -= 1;
            }
        }
    }
}

/// Get current memory usage
pub fn get_memory_usage() -> usize {
    MEMORY_STATS.lock().unwrap().total_heap_usage
}

/// Get active allocations count
pub fn get_active_allocations() -> usize {
    MEMORY_STATS.lock().unwrap().active_allocations
}

/// Cleanup unused buffers
pub fn cleanup_unused_buffers() {
    // Force garbage collection by triggering cleanup
    if let Ok(mut stats) = MEMORY_STATS.lock() {
        stats.buffer_allocations.clear();
    }
}

/// Check for memory leaks
pub fn has_memory_leaks() -> bool {
    let stats = MEMORY_STATS.lock().unwrap();
    stats.active_allocations > 100 || stats.total_heap_usage > 1024 * 1024 // 1MB threshold
}

/// Secure memory management utilities for cryptographic operations
/// Provides memory hygiene with automatic secret zeroization
pub struct SecureBuffer {
    data: Vec<u8>,
    is_active: bool,
}

impl SecureBuffer {
    /// Create a new secure buffer with specified capacity
    #[must_use]
    pub fn new(capacity: usize) -> Self {
        // Track allocation in global statistics
        if let Ok(mut stats) = MEMORY_STATS.lock() {
            stats.increment_allocation(capacity, "SecureBuffer");
        }
        
        SecureBuffer {
            data: vec![0u8; capacity],
            is_active: true,
        }
    }

    /// Create secure buffer from existing data
    #[must_use]
    pub fn from_bytes(data: Vec<u8>) -> Self {
        let capacity = data.len();
        
        // Track allocation in global statistics
        if let Ok(mut stats) = MEMORY_STATS.lock() {
            stats.increment_allocation(capacity, "SecureBuffer");
        }
        
        SecureBuffer {
            data,
            is_active: true,
        }
    }

    /// Get immutable reference to data (only if active)
    pub fn as_slice(&self) -> Result<&[u8], &'static str> {
        if self.is_active {
            Ok(&self.data)
        } else {
            Err("Buffer has been zeroized")
        }
    }

    /// Get mutable reference to data (only if active)
    pub fn as_mut_slice(&mut self) -> Result<&mut [u8], &'static str> {
        if self.is_active {
            Ok(&mut self.data)
        } else {
            Err("Buffer has been zeroized")
        }
    }

    /// Get length of buffer
    #[must_use]
    pub fn len(&self) -> usize {
        self.data.len()
    }

    /// Check if buffer is empty
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    /// Check if buffer is active (not zeroized)
    #[must_use]
    pub fn is_active(&self) -> bool {
        self.is_active
    }

    /// Explicitly zeroize buffer (called automatically on drop)
    pub fn zeroize_buffer(&mut self) {
        if self.is_active {
            self.data.zeroize();
            self.is_active = false;
        }
    }
}

impl Drop for SecureBuffer {
    fn drop(&mut self) {
        // Track deallocation in global statistics
        if let Ok(mut stats) = MEMORY_STATS.lock() {
            stats.decrement_allocation(self.data.len(), "SecureBuffer");
        }
        
        self.zeroize_buffer();
    }
}

/// Memory pool for frequent crypto operations to reduce allocations
pub struct MemoryPool {
    encryption_buffers: Vec<SecureBuffer>,
    temp_buffers: Vec<SecureBuffer>,
    pool_size: usize,
}

impl MemoryPool {
    /// Create new memory pool with specified pool size
    #[must_use]
    pub fn new(pool_size: usize) -> Self {
        MemoryPool {
            encryption_buffers: Vec::with_capacity(pool_size),
            temp_buffers: Vec::with_capacity(pool_size),
            pool_size,
        }
    }

    /// Get encryption buffer from pool or create new one
    pub fn get_encryption_buffer(&mut self, size: usize) -> SecureBuffer {
        if let Some(mut buffer) = self.encryption_buffers.pop() {
            if buffer.len() >= size {
                // Reuse existing buffer
                if let Ok(slice) = buffer.as_mut_slice() {
                    slice.zeroize(); // Clear previous data
                }
                buffer.is_active = true;
                return buffer;
            }
        }
        SecureBuffer::new(size)
    }

    /// Return encryption buffer to pool
    pub fn return_encryption_buffer(&mut self, mut buffer: SecureBuffer) {
        if self.encryption_buffers.len() < self.pool_size {
            buffer.zeroize_buffer();
            self.encryption_buffers.push(buffer);
        }
        // If pool is full, buffer will be dropped and zeroized
    }

    /// Get temporary buffer from pool or create new one
    pub fn get_temp_buffer(&mut self, size: usize) -> SecureBuffer {
        if let Some(mut buffer) = self.temp_buffers.pop() {
            if buffer.len() >= size {
                if let Ok(slice) = buffer.as_mut_slice() {
                    slice.zeroize(); // Clear previous data
                }
                buffer.is_active = true;
                return buffer;
            }
        }
        SecureBuffer::new(size)
    }

    /// Return temporary buffer to pool
    pub fn return_temp_buffer(&mut self, mut buffer: SecureBuffer) {
        if self.temp_buffers.len() < self.pool_size {
            buffer.zeroize_buffer();
            self.temp_buffers.push(buffer);
        }
    }

    /// Clear all buffers in pool (emergency cleanup)
    pub fn clear_pool(&mut self) {
        self.encryption_buffers.clear();
        self.temp_buffers.clear();
    }
}

impl Drop for MemoryPool {
    fn drop(&mut self) {
        self.clear_pool();
    }
}

/// WASM-exposed memory utilities
#[wasm_bindgen]
pub struct MemoryManager {
    pool: MemoryPool,
}

#[wasm_bindgen]
impl MemoryManager {
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new() -> MemoryManager {
        MemoryManager {
            pool: MemoryPool::new(10), // Pool size of 10 buffers
        }
    }

    /// Force cleanup of all memory pools (emergency function)
    #[wasm_bindgen]
    pub fn emergency_cleanup(&mut self) {
        self.pool.clear_pool();
    }

    /// Get memory usage statistics
    #[wasm_bindgen]
    #[must_use]
    pub fn get_stats(&self) -> String {
        format!(
            "{{\"encryption_buffers\":{},\"temp_buffers\":{}}}",
            self.pool.encryption_buffers.len(),
            self.pool.temp_buffers.len()
        )
    }
}

impl Default for MemoryManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Secure temporary data holder that auto-zeroizes
#[wasm_bindgen]
pub struct SecureTempData {
    buffer: SecureBuffer,
}

#[wasm_bindgen]
impl SecureTempData {
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new(size: usize) -> SecureTempData {
        SecureTempData {
            buffer: SecureBuffer::new(size),
        }
    }

    /// Create from bytes
    #[wasm_bindgen]
    #[must_use]
    pub fn from_bytes(data: Vec<u8>) -> SecureTempData {
        SecureTempData {
            buffer: SecureBuffer::from_bytes(data),
        }
    }

    /// Get data length
    #[wasm_bindgen]
    #[must_use]
    pub fn length(&self) -> usize {
        self.buffer.len()
    }

    /// Check if data is active
    #[wasm_bindgen]
    #[must_use]
    pub fn is_active(&self) -> bool {
        self.buffer.is_active()
    }

    /// Manually zeroize data
    #[wasm_bindgen]
    pub fn zeroize(&mut self) {
        self.buffer.zeroize_buffer();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_secure_buffer_creation() {
        let buffer = SecureBuffer::new(32);
        assert_eq!(buffer.len(), 32);
        assert!(buffer.is_active());
        assert!(buffer.as_slice().is_ok());
    }

    #[test]
    fn test_secure_buffer_zeroization() {
        let mut buffer = SecureBuffer::new(32);
        assert!(buffer.is_active());
        
        buffer.zeroize_buffer();
        assert!(!buffer.is_active());
        assert!(buffer.as_slice().is_err());
    }

    #[test]
    fn test_memory_pool() {
        let mut pool = MemoryPool::new(2);
        let buffer1 = pool.get_encryption_buffer(64);
        let buffer2 = pool.get_encryption_buffer(64);
        
        pool.return_encryption_buffer(buffer1);
        pool.return_encryption_buffer(buffer2);
        
        assert_eq!(pool.encryption_buffers.len(), 2);
    }

    #[test]
    fn test_memory_manager() {
        let mut manager = MemoryManager::new();
        let stats = manager.get_stats();
        assert!(stats.contains("encryption_buffers"));
        assert!(stats.contains("temp_buffers"));
    }
}