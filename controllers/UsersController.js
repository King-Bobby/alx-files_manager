import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class UsersController {
  static async getMe(req, res) {
    const { 'x-token': token } = req.headers;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.client.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient
      .client.db(dbClient.database)
      .collection('users')
      .findOne({ _id: dbClient.getObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userData = {
      id: user._id.toString(),
      email: user.email,
    };

    return res.status(200).json(userData);
  }
}

export default UsersController;
