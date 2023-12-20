import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
  static async getStatus(req, res) {
    const status = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };

    return res.status(200).json(status);
  }

  static async getStats(req, res) {
    try {
      const usersCount = await dbClient.nbUsers();
      const filesCount = await dbClient.nbFiles();

      const stats = {
        users: usersCount,
        files: filesCount,
      };

      return res.status(200).json(stats);
    } catch (error) {
      console.error('Error getting stats:', error);
      return res.status(500).send('Internal Server Error');
    }
  }
}

export default AppController;
