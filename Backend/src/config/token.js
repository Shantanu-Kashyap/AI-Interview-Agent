import jwt from 'jsonwebtoken'

const genToken = (userId) => {
  try {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' })
    return token
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error('Token generation failed');
  }
}

export default genToken