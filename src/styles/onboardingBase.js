import { StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export const base = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
  },

  title: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 32,
  },

  input: {
    height: 54,
    borderRadius: 28,
    backgroundColor: colors.glass,
    paddingHorizontal: 22,
    color: colors.text,
    marginBottom: 16,
    fontSize: 14,
  },

  button: {
    height: 56,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 2,
    fontSize: 13,
  },

  skip: {
    marginTop: 14,
    color: colors.subtle,
    fontSize: 12,
    textAlign: 'center',
  },
});
