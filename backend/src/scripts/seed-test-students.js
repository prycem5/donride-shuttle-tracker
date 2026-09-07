import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../lib/db/connect.js';
import User from '../lib/db/models/User.js';

const seedTestStudents = async () => {
  try {
    await connectDB();
    console.log('Creating test student accounts...\n');

    const testStudents = [
      {
        email: 'student1@pfw.edu',
        password: 'password123',
        name: 'Test Student 1',
        studentId: '12345678'
      },
      {
        email: 'student2@pfw.edu',
        password: 'password123',
        name: 'Test Student 2',
        studentId: '87654321'
      },
      {
        email: 'demo@pfw.edu',
        password: 'demo123',
        name: 'Demo Student',
        studentId: '99999999'
      }
    ];

    console.log('📝 Creating student accounts...\n');

    for (const student of testStudents) {
      // Hash password
      const hashedPassword = await bcrypt.hash(student.password, 10);

      // Create custom student ID
      const userId = `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create or update user
      const user = await User.findOneAndUpdate(
        { email: student.email },
        {
          _id: userId,
          email: student.email,
          password: hashedPassword,
          name: student.name,
          studentId: student.studentId,
          roles: ['student'],
          image: null
        },
        { upsert: true, new: true }
      );

      console.log(`Created: ${student.email}`);
      console.log(`Password: ${student.password}`);
      console.log(`Student ID: ${student.studentId}`);
      console.log(`User ID: ${user._id}\n`);
    }

    console.log('\nTest student accounts created successfully!');
    console.log('\nLogin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    testStudents.forEach(student => {
      console.log(`Email: ${student.email}`);
      console.log(`Password: ${student.password}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    console.log('\nTest at: http://localhost:3000/student/signin\n');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding students:', error);
    process.exit(1);
  }
};

seedTestStudents();
