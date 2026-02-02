export type UserEntity = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export type PublicUserEntity = Omit<UserEntity, 'password'>;
