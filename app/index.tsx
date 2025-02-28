import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, Button, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

async function registerForPushNotifications() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
}

type Reminder = {
  id: string;
  date: string;
  time: string;
  text: string;
  completed: boolean;
};

const ReminderApp: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [completedReminders, setCompletedReminders] = useState<Reminder[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [newReminder, setNewReminder] = useState<Omit<Reminder, 'id' | 'completed'>>({ date: '', time: '', text: '' });
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  useEffect(() => {
    registerForPushNotifications();
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const storedReminders = await AsyncStorage.getItem('reminders');
      if (storedReminders) {
        const parsedReminders: Reminder[] = JSON.parse(storedReminders);
        const activeReminders = parsedReminders.filter(r => !r.completed);
        const completed = parsedReminders.filter(r => r.completed);
        setReminders(activeReminders);
        setCompletedReminders(completed);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const saveReminders = async (updatedReminders: Reminder[]) => {
    try {
      await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));
    } catch (error) {
      console.error('Error saving reminders:', error);
    }
  };

  const addReminder = () => {
    if (!newReminder.date || !newReminder.time || !newReminder.text) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    const reminderDate = new Date(`${newReminder.date}T${newReminder.time}`);
    const now = new Date();
    const secondsUntilReminder = Math.floor((reminderDate.getTime() - now.getTime()) / 1000);
    console.warn(secondsUntilReminder)
    if (secondsUntilReminder < 0) {
      Alert.alert('Reminder time is in the past. Cannot schedule notification.');
      return;
    }
    scheduleNotification(newReminder);
    const reminder: Reminder = {
      id: Math.random().toString(),
      ...newReminder,
      completed: false,
    };
    const updatedReminders = [...reminders, reminder].sort((a, b) =>
      new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime()
    );
    setReminders(updatedReminders);
    saveReminders([...updatedReminders, ...completedReminders]);
    setModalVisible(false);
  };

  const scheduleNotification = async (reminder: { date: string; time: string; text: string }) => {
    const reminderDate = new Date(`${reminder.date}T${reminder.time}`);
    const now = new Date();
    const secondsUntilReminder = Math.floor((reminderDate.getTime() - now.getTime()) / 1000);
  
    if (secondsUntilReminder > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reminder',
          body: reminder.text,
          sound: true,
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntilReminder, 
          repeats: false, 
        },
      });
    } else {
      console.warn('Reminder time is in the past. Cannot schedule notification.');
    }
  };

  const markAsComplete = (id: string) => {
    Alert.alert('Confirmation', 'Want to mark this as Complete?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: () => {
          const updatedReminders = reminders.filter(r => r.id !== id);
          const completedItem = reminders.find(r => r.id === id);
          if (completedItem) {
            completedItem.completed = true;
            setCompletedReminders([...completedReminders, completedItem]);
          }
          setReminders(updatedReminders);
          saveReminders([...updatedReminders, ...completedReminders]);
        },
      },
    ]);
  };

  const deleteReminder = (id: string) => {
    Alert.alert('Delete', 'Are you sure you want to delete this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        onPress: () => {
          const updatedCompleted = completedReminders.filter(r => r.id !== id);
          setCompletedReminders(updatedCompleted);
          saveReminders([...reminders, ...updatedCompleted]);
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <View style={{ flex: 1, padding: 16, paddingTop: 50 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Reminders</Text>
      <FlatList
        data={reminders}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10 }}>
            <Text style={{ fontSize: 15}}>{item.date} {item.time} - {item.text}</Text>
            <TouchableOpacity onPress={() => markAsComplete(item.id)}>
              <Text>[✓]</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Completed</Text>
      <FlatList
        data={completedReminders}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10 }}>
            <Text  style={{ fontSize: 15}}>{item.date} {item.time} - {item.text}</Text>
            <TouchableOpacity onPress={() => deleteReminder(item.id)}>
              <Text>[X]</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Text style={{ fontSize: 40 }}>+</Text>
      </TouchableOpacity>
      <Modal visible={modalVisible} transparent>
        <View style={{ flex: 2, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: 'white', padding: 30, borderRadius: 20 }}>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <Text style={{ fontSize: 25 }}>{newReminder.date || 'Select Date'}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={newReminder.date ? new Date(newReminder.date) : new Date()}
                mode="date"
                display="default"
                onChange={(_, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setNewReminder({ ...newReminder, date: selectedDate.toISOString().split('T')[0] });
                }}
              />
            )}
            <TouchableOpacity onPress={() => setShowTimePicker(true)}>
              <Text style={{ fontSize: 25 }}>{newReminder.time || 'Select Time'}</Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                display="default"
                onChange={(_, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) setNewReminder({ ...newReminder, time: selectedTime.toTimeString().split(' ')[0] });
                }}
              />
            )}
            <TextInput style={{ fontSize: 25 }} placeholder="Reminder Text" onChangeText={text => setNewReminder({ ...newReminder, text })} />
            <Button title="Add" onPress={addReminder} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ReminderApp;
