-- Wassel AI Database Schema
-- This schema supports all AI features including logging, configuration, and user preferences

-- ============================================
-- AI Configuration Table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enabled BOOLEAN DEFAULT true,
    features JSONB DEFAULT '{
        "smartRoutes": true,
        "dynamicPricing": true,
        "riskAssessment": true,
        "nlpSearch": true,
        "recommendations": true,
        "predictive": true,
        "smartMatching": true,
        "conversationAI": true
    }'::jsonb,
    models JSONB DEFAULT '{
        "routeOptimization": "bert-multilingual-v3.2",
        "pricingModel": "xgboost-v2.1",
        "riskModel": "random-forest-v3.0",
        "nlpModel": "bert-multilingual-ner-v2.5",
        "recommendationModel": "collaborative-filtering-v2.3"
    }'::jsonb,
    thresholds JSONB DEFAULT '{
        "riskScore": 0.7,
        "matchConfidence": 0.6,
        "pricingConfidence": 0.8
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default config
INSERT INTO ai_config (id, enabled) VALUES ('00000000-0000-0000-0000-000000000001', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- User AI Preferences Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_ai_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ai_enabled BOOLEAN DEFAULT true,
    features_enabled JSONB DEFAULT '{
        "smartRoutes": true,
        "dynamicPricing": true,
        "riskAssessment": true,
        "nlpSearch": true,
        "recommendations": true,
        "predictive": true,
        "smartMatching": true,
        "conversationAI": true
    }'::jsonb,
    consent_given_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    consent_version TEXT DEFAULT 'v1.0',
    data_sharing_allowed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AI Interaction Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    feature TEXT NOT NULL,
    input JSONB,
    output JSONB,
    confidence DECIMAL(3, 2),
    source TEXT CHECK (source IN ('ai', 'rule-based', 'cached')),
    latency INTEGER, -- in milliseconds
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    device_type TEXT CHECK (device_type IN ('web', 'ios', 'android')),
    session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_feature ON ai_logs(feature);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_success ON ai_logs(success);

-- ============================================
-- AI Recommendations Cache Table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_recommendations_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL, -- 'personalized', 'trending', 'price_alert'
    recommendations JSONB NOT NULL,
    confidence DECIMAL(3, 2),
    context JSONB, -- location, time, preferences used
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_recs_user_id ON ai_recommendations_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recs_expires ON ai_recommendations_cache(expires_at);

-- Auto-delete expired recommendations
CREATE OR REPLACE FUNCTION delete_expired_ai_recommendations()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM ai_recommendations_cache WHERE expires_at < NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_expired_ai_recommendations
    AFTER INSERT ON ai_recommendations_cache
    EXECUTE FUNCTION delete_expired_ai_recommendations();

-- ============================================
-- AI Risk Assessments Table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('signup', 'booking', 'profile_update', 'payment')),
    risk_score DECIMAL(3, 2) NOT NULL,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    flags TEXT[], -- array of risk flags
    recommendation TEXT,
    data_analyzed JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_risk_user_id ON ai_risk_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_risk_action ON ai_risk_assessments(action);
CREATE INDEX IF NOT EXISTS idx_ai_risk_level ON ai_risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_ai_risk_created_at ON ai_risk_assessments(created_at DESC);

-- ============================================
-- AI Dynamic Pricing Cache Table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_pricing_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_from TEXT NOT NULL,
    route_to TEXT NOT NULL,
    distance_km DECIMAL(10, 2),
    departure_time TIMESTAMP WITH TIME ZONE,
    seats INTEGER,
    trip_type TEXT CHECK (trip_type IN ('passenger', 'package')),
    calculated_price DECIMAL(10, 2) NOT NULL,
    price_breakdown JSONB,
    confidence DECIMAL(3, 2),
    factors TEXT[],
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create composite index for route lookups
CREATE INDEX IF NOT EXISTS idx_ai_pricing_route ON ai_pricing_cache(route_from, route_to, departure_time);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_expires ON ai_pricing_cache(expires_at);

-- ============================================
-- AI Smart Matches Cache Table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_smart_matches_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    search_criteria JSONB NOT NULL,
    matches JSONB NOT NULL, -- array of matched trips with scores
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '5 minutes'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_matches_user ON ai_smart_matches_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_matches_expires ON ai_smart_matches_cache(expires_at);

-- ============================================
-- AI Model Performance Metrics Table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_model_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    metric_type TEXT NOT NULL, -- 'accuracy', 'latency', 'confidence', 'fallback_rate'
    metric_value DECIMAL(10, 4) NOT NULL,
    sample_size INTEGER,
    metadata JSONB,
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_metrics_model ON ai_model_metrics(model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_type ON ai_model_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_measured ON ai_model_metrics(measured_at DESC);

-- ============================================
-- AI Conversation Suggestions Cache
-- ============================================
CREATE TABLE IF NOT EXISTS ai_conversation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_hash TEXT NOT NULL UNIQUE, -- hash of last N messages
    suggestions TEXT[] NOT NULL,
    sentiment TEXT,
    language TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_ai_conv_expires ON ai_conversation_cache(expires_at);

-- ============================================
-- AI Feature Usage Analytics View
-- ============================================
CREATE OR REPLACE VIEW ai_feature_usage AS
SELECT
    feature,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE success = true) as successful_requests,
    COUNT(*) FILTER (WHERE success = false) as failed_requests,
    ROUND(AVG(latency)::numeric, 2) as avg_latency_ms,
    ROUND(AVG(confidence)::numeric, 2) as avg_confidence,
    COUNT(*) FILTER (WHERE source = 'ai') as ai_responses,
    COUNT(*) FILTER (WHERE source = 'rule-based') as fallback_responses,
    COUNT(*) FILTER (WHERE source = 'cached') as cached_responses,
    DATE(created_at) as date
FROM ai_logs
GROUP BY feature, DATE(created_at)
ORDER BY date DESC, total_requests DESC;

-- ============================================
-- AI User Adoption Analytics View
-- ============================================
CREATE OR REPLACE VIEW ai_user_adoption AS
SELECT
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE ai_enabled = true) as ai_enabled_users,
    COUNT(*) FILTER (WHERE ai_enabled = false) as ai_disabled_users,
    ROUND(
        (COUNT(*) FILTER (WHERE ai_enabled = true)::numeric / COUNT(*)::numeric) * 100,
        2
    ) as adoption_percentage
FROM user_ai_preferences;

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- AI Config: Only admins can modify, everyone can read
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AI config is viewable by everyone"
    ON ai_config FOR SELECT
    USING (true);

CREATE POLICY "AI config is modifiable by admins only"
    ON ai_config FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- User AI Preferences: Users can only manage their own
ALTER TABLE user_ai_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI preferences"
    ON user_ai_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI preferences"
    ON user_ai_preferences FOR ALL
    USING (auth.uid() = user_id);

-- AI Logs: Users can view their own, admins can view all
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI logs"
    ON ai_logs FOR SELECT
    USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

-- AI Recommendations Cache: Users can view their own
ALTER TABLE ai_recommendations_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendations"
    ON ai_recommendations_cache FOR SELECT
    USING (auth.uid() = user_id);

-- AI Risk Assessments: Users can view their own, admins can view all
ALTER TABLE ai_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own risk assessments"
    ON ai_risk_assessments FOR SELECT
    USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

-- AI Smart Matches Cache: Users can view their own
ALTER TABLE ai_smart_matches_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own smart matches"
    ON ai_smart_matches_cache FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- Functions for AI Operations
-- ============================================

-- Function to log AI interaction
CREATE OR REPLACE FUNCTION log_ai_interaction(
    p_user_id UUID,
    p_feature TEXT,
    p_input JSONB,
    p_output JSONB,
    p_confidence DECIMAL,
    p_source TEXT,
    p_latency INTEGER,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT 'web',
    p_session_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO ai_logs (
        user_id,
        feature,
        input,
        output,
        confidence,
        source,
        latency,
        success,
        error_message,
        device_type,
        session_id
    ) VALUES (
        p_user_id,
        p_feature,
        p_input,
        p_output,
        p_confidence,
        p_source,
        p_latency,
        p_success,
        p_error_message,
        p_device_type,
        COALESCE(p_session_id, uuid_generate_v4())
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user AI preferences
CREATE OR REPLACE FUNCTION get_user_ai_preferences(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_preferences JSONB;
BEGIN
    SELECT jsonb_build_object(
        'ai_enabled', ai_enabled,
        'features_enabled', features_enabled,
        'data_sharing_allowed', data_sharing_allowed
    )
    INTO v_preferences
    FROM user_ai_preferences
    WHERE user_id = p_user_id;
    
    -- If no preferences exist, create default
    IF v_preferences IS NULL THEN
        INSERT INTO user_ai_preferences (user_id)
        VALUES (p_user_id)
        RETURNING jsonb_build_object(
            'ai_enabled', ai_enabled,
            'features_enabled', features_enabled,
            'data_sharing_allowed', data_sharing_allowed
        )
        INTO v_preferences;
    END IF;
    
    RETURN v_preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user AI consent
CREATE OR REPLACE FUNCTION update_user_ai_consent(
    p_user_id UUID,
    p_ai_enabled BOOLEAN,
    p_features_enabled JSONB DEFAULT NULL,
    p_data_sharing_allowed BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO user_ai_preferences (
        user_id,
        ai_enabled,
        features_enabled,
        data_sharing_allowed,
        updated_at
    ) VALUES (
        p_user_id,
        p_ai_enabled,
        COALESCE(p_features_enabled, '{}'::jsonb),
        COALESCE(p_data_sharing_allowed, true),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        ai_enabled = EXCLUDED.ai_enabled,
        features_enabled = COALESCE(EXCLUDED.features_enabled, user_ai_preferences.features_enabled),
        data_sharing_allowed = COALESCE(EXCLUDED.data_sharing_allowed, user_ai_preferences.data_sharing_allowed),
        updated_at = NOW();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old AI logs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_ai_logs(p_days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM ai_logs
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Scheduled Cleanup (requires pg_cron extension)
-- ============================================
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('cleanup-old-ai-logs', '0 2 * * *', 'SELECT cleanup_old_ai_logs(90);');

-- ============================================
-- Analytics Helper Functions
-- ============================================

-- Get AI performance summary for a specific feature
CREATE OR REPLACE FUNCTION get_ai_feature_performance(
    p_feature TEXT,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    total_requests BIGINT,
    success_rate DECIMAL,
    avg_latency DECIMAL,
    avg_confidence DECIMAL,
    fallback_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_requests,
        ROUND((COUNT(*) FILTER (WHERE success = true)::numeric / COUNT(*)::numeric) * 100, 2) as success_rate,
        ROUND(AVG(latency)::numeric, 2) as avg_latency,
        ROUND(AVG(confidence)::numeric, 2) as avg_confidence,
        ROUND((COUNT(*) FILTER (WHERE source = 'rule-based')::numeric / COUNT(*)::numeric) * 100, 2) as fallback_rate
    FROM ai_logs
    WHERE feature = p_feature
    AND created_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Indexes for Performance
-- ============================================

-- Additional composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_feature_date 
    ON ai_logs(user_id, feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_logs_source_success 
    ON ai_logs(source, success);

-- GIN index for JSONB fields (for efficient JSON queries)
CREATE INDEX IF NOT EXISTS idx_ai_logs_input_gin 
    ON ai_logs USING GIN (input);

CREATE INDEX IF NOT EXISTS idx_ai_logs_output_gin 
    ON ai_logs USING GIN (output);

-- ============================================
-- Grants (if using specific roles)
-- ============================================

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ai_config TO authenticated;
GRANT ALL ON user_ai_preferences TO authenticated;
GRANT INSERT ON ai_logs TO authenticated;
GRANT SELECT ON ai_logs TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION log_ai_interaction TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_ai_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_ai_consent TO authenticated;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE ai_config IS 'Global AI system configuration and feature flags';
COMMENT ON TABLE user_ai_preferences IS 'User-specific AI feature preferences and consent tracking';
COMMENT ON TABLE ai_logs IS 'Detailed logs of all AI interactions for analytics and debugging';
COMMENT ON TABLE ai_recommendations_cache IS 'Cached AI recommendations to reduce API calls';
COMMENT ON TABLE ai_risk_assessments IS 'Historical risk assessment records for security monitoring';
COMMENT ON TABLE ai_pricing_cache IS 'Cached dynamic pricing calculations';
COMMENT ON TABLE ai_smart_matches_cache IS 'Cached smart matching results';
COMMENT ON TABLE ai_model_metrics IS 'AI model performance metrics for monitoring';
COMMENT ON TABLE ai_conversation_cache IS 'Cached conversation AI suggestions';

COMMENT ON FUNCTION log_ai_interaction IS 'Logs an AI interaction for analytics and model improvement';
COMMENT ON FUNCTION get_user_ai_preferences IS 'Retrieves user AI preferences, creating defaults if needed';
COMMENT ON FUNCTION update_user_ai_consent IS 'Updates user AI consent and feature preferences';
COMMENT ON FUNCTION cleanup_old_ai_logs IS 'Removes AI logs older than specified days';
COMMENT ON FUNCTION get_ai_feature_performance IS 'Returns performance metrics for a specific AI feature';
