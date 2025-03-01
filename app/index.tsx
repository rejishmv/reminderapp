import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, Button, Alert, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Checkbox, Card, Divider, IconButton } from 'react-native-paper';


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
  notificationId?: string;
};

const ReminderApp: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [completedReminders, setCompletedReminders] = useState<Reminder[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [newReminder, setNewReminder] = useState<Omit<Reminder, 'id' | 'completed'>>({ date: '', time: '', text: '' });
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [remindersExpanded, setRemindersExpanded] = useState(true);
  const [completedExpanded, setCompletedExpanded] = useState(false);

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

  const addReminder = async () => {
    if (!newReminder.date || !newReminder.time || !newReminder.text) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
  
    const reminderDate = new Date(`${newReminder.date}T${newReminder.time}`);
    const now = new Date();
    const secondsUntilReminder = Math.floor((reminderDate.getTime() - now.getTime()) / 1000);
  
    if (secondsUntilReminder < 0) {
      Alert.alert('Reminder time is in the past. Cannot schedule notification.');
      return;
    }
  
    // Create a full Reminder object including id and completed
    const reminder: Reminder = {
      id: Math.random().toString(),
      ...newReminder,
      completed: false,
    };
  
    let notificationId: string | null = null;
    try {
      notificationId = await scheduleNotification(reminder); // Now passing a valid Reminder object
    } catch (error) {
      console.error("Failed to schedule notification:", error);
      Alert.alert('Error', 'Failed to schedule notification.');
      return;
    }
  
    // Store the notificationId in the reminder object
    reminder.notificationId = notificationId || undefined;
  
    const updatedReminders = [...reminders, reminder].sort((a, b) =>
      new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
    );
  
    setReminders(updatedReminders);
    saveReminders([...updatedReminders, ...completedReminders]);
    setModalVisible(false);
  };

  const scheduleNotification = async (reminder: Reminder) => {
    const reminderDate = new Date(`${reminder.date}T${reminder.time}`);
    const now = new Date();
    const secondsUntilReminder = Math.floor((reminderDate.getTime() - now.getTime()) / 1000);
  
    if (secondsUntilReminder > 0) {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reminder',
          body: reminder.text,
          sound: true,
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        },
      });
      return notificationId;
    } else {
      console.warn('Reminder time is in the past. Cannot schedule notification.');
      return null;
    }
  };

  const markAsComplete = async (id: string) => {
    Alert.alert('Confirmation', 'Want to mark this as Complete?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          const updatedReminders = reminders.filter(r => r.id !== id);
          const completedItem = reminders.find(r => r.id === id);
  
          if (completedItem) {
            completedItem.completed = true;
  
            // Cancel scheduled notification if exists
            if (completedItem.notificationId) {
              try {
                await Notifications.cancelScheduledNotificationAsync(completedItem.notificationId);
                console.log(`Notification ${completedItem.notificationId} canceled.`);
              } catch (error) {
                console.error("Error canceling notification:", error);
              }
            }
  
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
    <View style={{ flex: 1, padding: 16, paddingTop: 50, backgroundColor: '#f5f5f5' }}>
      
      {/* Active Reminders (Collapsible) */}
      <Card style={styles.card}>
        <TouchableOpacity onPress={() => setRemindersExpanded(!remindersExpanded)} style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Reminders</Text>
          <IconButton icon={remindersExpanded ? 'chevron-up' : 'chevron-down'} size={24} />
        </TouchableOpacity>
        {remindersExpanded && (
          <FlatList
            data={reminders}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.reminderItem}>
                <Checkbox status={item.completed ? 'checked' : 'unchecked'} onPress={() => markAsComplete(item.id)} />
                <Text style={styles.reminderText}>{item.date} {item.time} - {item.text}</Text>
              </View>
            )}
          />
        )}
      </Card>
  
      {/* Completed Reminders (Collapsible) */}
      <Card style={styles.card}>
        <TouchableOpacity onPress={() => setCompletedExpanded(!completedExpanded)} style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Completed</Text>
          <IconButton icon={completedExpanded ? 'chevron-up' : 'chevron-down'} size={24} />
        </TouchableOpacity>
        {completedExpanded && (
          <FlatList
            data={completedReminders}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.completedItem}>
                <Text style={styles.reminderText}>{item.date} {item.time} - {item.text}</Text>
                <IconButton icon="delete" iconColor="red" size={24} onPress={() => deleteReminder(item.id)} />
              </View>
            )}
          />
        )}
      </Card>
  
      {/* Floating Add Button */}
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      {/* Modal for Adding Reminder */}
      <Modal visible={modalVisible} transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateTimePicker}>{newReminder.date || 'Select Date'}</Text>
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
              <Text style={styles.dateTimePicker}>{newReminder.time || 'Select Time'}</Text>
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
            <TextInput 
              style={styles.input} 
              placeholder="Reminder Text" 
              onChangeText={text => setNewReminder({ ...newReminder, text })} 
            />
                  {/* Buttons: Add & Cancel */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.button, styles.modalButton]}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addReminder} style={[styles.button, styles.modalButton]}>
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#f5f5f5',
  },
  card: {
    borderRadius: 15,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  completedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  reminderText: {
    fontSize: 15,
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007bff',
    borderRadius: 50,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 30,
    color: '#fff',
  },
  modalContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 20,
    width: '80%',
    alignItems: 'center',
  },
  dateTimePicker: {
    fontSize: 18,
    color: '#007bff',
    marginBottom: 10,
  },
  input: {
    fontSize: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    width: '100%',
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalButton: {
    backgroundColor: '#007bff',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007bff',
    borderRadius: 50,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 30,
    color: '#fff',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default ReminderApp;
