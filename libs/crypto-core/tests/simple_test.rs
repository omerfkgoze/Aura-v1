#[cfg(test)]
mod tests {
    use crypto_core::*;

    #[test]
    fn test_memory_tracking() {
        reset_memory_stats();
        let initial_stats = get_memory_stats();
        
        assert_eq!(initial_stats.secrets_allocated, 0);
        assert_eq!(initial_stats.secrets_zeroized, 0);
        
        track_secret_allocation();
        track_secret_allocation();
        
        let after_alloc = get_memory_stats();
        assert_eq!(after_alloc.secrets_allocated, 2);
        
        track_secret_zeroization();
        
        let after_zero = get_memory_stats();
        assert_eq!(after_zero.secrets_zeroized, 1);
    }

    #[test]
    fn test_basic_functionality() {
        // Test that the module loads
        let result = test_crypto_core();
        assert_eq!(result, "Crypto core is working!");
    }
}