import { StyleSheet, Dimensions } from 'react-native';
import { colors } from '../theme/colors';

const SIZE = Math.min(Dimensions.get('window').width * 0.7, 280);

export const finish = StyleSheet.create({
  bgOrbTop: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(124,92,255,0.14)',
    top: -120,
    left: -50,
  },
  bgOrbRight: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(108,255,181,0.1)',
    top: 140,
    right: -90,
  },
  bgOrbBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(124,92,255,0.1)',
    bottom: -170,
    left: 10,
  },
  glowHalo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(124,92,255,0.08)',
    alignSelf: 'center',
    top: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radarWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },

  pulse: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(140,120,255,0.35)',
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#9b7bff',
    shadowColor: '#9b7bff',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },

  title: {
    fontSize: 28,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
  },

  subtitle: {
    fontSize: 14,
    color: colors.subtle,
    textAlign: 'center',
    opacity: 0.8,
  },
});
