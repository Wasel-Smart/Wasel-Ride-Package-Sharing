import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    type ViewStyle,
    type TextStyle,
} from 'react-native';
import { colors, spacing, typography } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    disabled = false,
    loading = false,
    style,
    textStyle,
    testID,
}) => {
    const buttonStyles: ViewStyle[] = [styles.baseButton];
    const textStyles: TextStyle[] = [styles.baseText];

    if (variant === 'primary') {
        buttonStyles.push(styles.primaryButton);
        textStyles.push(styles.primaryText);
    } else if (variant === 'secondary') {
        buttonStyles.push(styles.secondaryButton);
        textStyles.push(styles.secondaryText);
    } else if (variant === 'ghost') {
        buttonStyles.push(styles.ghostButton);
        textStyles.push(styles.ghostText);
    } else if (variant === 'danger') {
        buttonStyles.push(styles.dangerButton);
        textStyles.push(styles.dangerText);
    }

    if (disabled || loading) {
        buttonStyles.push(styles.disabledButton);
    }

    return (
        <TouchableOpacity
            onPress={disabled || loading ? undefined : onPress}
            style={[...buttonStyles, style]}
            disabled={disabled || loading}
            testID={testID}
        >
            {loading ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={[...textStyles, textStyle]}>{title}</Text>}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    baseButton: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    baseText: {
        fontSize: typography.body.fontSize,
        fontWeight: '700',
    },
    primaryButton: {
        backgroundColor: colors.primary,
    },
    primaryText: {
        color: colors.textPrimary,
    },
    secondaryButton: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    secondaryText: {
        color: colors.textPrimary,
    },
    ghostButton: {
        backgroundColor: 'transparent',
    },
    ghostText: {
        color: colors.primary,
    },
    dangerButton: {
        backgroundColor: colors.error,
    },
    dangerText: {
        color: colors.textPrimary,
    },
    disabledButton: {
        opacity: 0.6,
    },
});