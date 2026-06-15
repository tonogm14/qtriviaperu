import React from 'react';
import { View, TextInput, TextInputProps, StyleSheet } from 'react-native';

interface JuvPillInputProps extends TextInputProps {
  error?: string;
}

export const JuvPillInput: React.FC<JuvPillInputProps> = ({
  style,
  secureTextEntry,
  ...rest
}) => {
  return (
    <View style={styles.wrapper}>
      <TextInput
        style={[styles.input, style as object]}
        placeholderTextColor="rgba(255,255,255,0.4)"
        selectionColor="#FACC15"
        secureTextEntry={secureTextEntry}
        {...rest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  input: {
    height: 56,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 22,
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
